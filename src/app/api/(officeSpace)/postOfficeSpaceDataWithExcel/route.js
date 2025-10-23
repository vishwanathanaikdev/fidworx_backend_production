// src/app/api/(officeSpace)/postOfficeSpaceDataWithExcel/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import UserDataModel from "@/app/models/usersDataModel/schema";
import Counter from "@/app/models/counterModel/schema"; // Added Counter model
import mongoose from "mongoose";
import * as xlsx from "xlsx";

// Function to get the next sequence value
async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findByIdAndUpdate(
      sequenceName,
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
  );
  return sequenceDocument.sequence_value;
}

// Helper function to convert string "TRUE" to boolean
const toBoolean = (value) => {
    if (typeof value === 'string') {
        return value.trim().toUpperCase() === 'TRUE';
    }
    return !!value;
};

// Helper function to reliably parse dates
const parseDate = (excelDate) => {
    if (!excelDate) return null;
    const date = new Date(excelDate);
    return isNaN(date.getTime()) ? null : date;
};

export async function POST(request) {
  try {
    await connectdb();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ message: "No file uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dataFromExcel = xlsx.utils.sheet_to_json(sheet);

    if (!Array.isArray(dataFromExcel) || dataFromExcel.length === 0) {
      return NextResponse.json({ message: "The Excel file is empty or could not be processed." }, { status: 400 });
    }

    // --- INTELLIGENT UPLOAD LOGIC ---

    const allUsers = await UserDataModel.find({}, 'email');
    const agentEmailToIdMap = new Map(
      allUsers.map(user => [user.email.toLowerCase(), user._id])
    );

    const existingProperties = await OfficeSpaceModel.find({}, 'buildingName');
    const existingBuildingNames = new Set(
      existingProperties.map(prop => prop.buildingName.toLowerCase())
    );

    const dataToInsert = [];
    const duplicatesFound = [];
    const failedEntries = [];

    for (const item of dataFromExcel) {
      const buildingName = item.buildingName;
      const agentEmail = item.assigned_agent_email?.toLowerCase();
      const officeType = item.type?.toLowerCase();

      if (officeType !== 'office') {
        failedEntries.push({ buildingName, reason: `Invalid office type: '${item.type}'. Expected 'office'.` });
        continue;
      }

      if (!buildingName) {
        failedEntries.push({ buildingName: 'MISSING_NAME', reason: 'Building name is required.' });
        continue;
      }

      if (existingBuildingNames.has(buildingName.toLowerCase())) {
        duplicatesFound.push({ buildingName });
        continue;
      }

      const agentId = agentEmailToIdMap.get(agentEmail);
      if (!agentId) {
        failedEntries.push({ buildingName, reason: `Assigned agent email '${item.assigned_agent_email}' not found.` });
        continue;
      }

      const propertyId = `P${await getNextSequenceValue("propertyId")}`; // ✅ FIX: Generate Property ID

      const processedItem = {
        propertyId, // ✅ FIX: Add Property ID to the document
        buildingName: buildingName,
        type: "office",
        generalInfo: {
            seaterOffered: item.seaterOffered,
            floorSize: item.floorSize,
            totalBuiltUpArea: item.totalBuiltUpArea,
            floors: item.floors,
            floorsName: item.floorsName,
            rentPerSeat: item.rentPerSeat,
            rentPrice: item.rentPrice,
            maintenanceCharges: item.maintenanceCharges,
            powerBackup: toBoolean(item.powerBackup),
            ocAvailability: toBoolean(item.ocAvailability),
            lockInPeriod: item.lockInPeriod,
            furnishingLevel: item.furnishingLevel,
        },
        amenities: {
            parking: toBoolean(item.parking),
            parking4Wheeler: toBoolean(item.parking4Wheeler),
            parking2Wheeler: toBoolean(item.parking2Wheeler),
            security: toBoolean(item.security),
            security24x7: toBoolean(item.security24x7),
            pantryArea: toBoolean(item.pantryArea),
            firstAidKit: toBoolean(item.firstAidKit),
            fireExtinguisher: toBoolean(item.fireExtinguisher),
            airConditioners: toBoolean(item.airConditioners),
            powerBackup: toBoolean(item.powerBackup_amenities),
            wifi: toBoolean(item.wifi),
            lift: toBoolean(item.lift),
            gym: toBoolean(item.gym),
            chairs: item.chairs,
            washrooms: item.washrooms,
            meetingRooms: toBoolean(item.meetingRooms),
        },
        location: {
            address: item.address,
            city: item.city,
            zone: item.zone,
            locationOfProperty: item.locationOfProperty,
            link: item.link,
        },
        transit: {
            metroStations: typeof item.metroStations === 'string' ? item.metroStations.split(',').map(s => s.trim()) : [],
            busStations: typeof item.busStations === 'string' ? item.busStations.split(',').map(s => s.trim()) : [],
            trainStations: typeof item.trainStations === 'string' ? item.trainStations.split(',').map(s => s.trim()) : [],
            airports: typeof item.airports === 'string' ? item.airports.split(',').map(s => s.trim()) : [],
        },
        publicFacilities: {
             hospital: typeof item.hospital === 'string' ? item.hospital.split(',').map(s => s.trim()) : [],
             restaurants: typeof item.restaurants === 'string' ? item.restaurants.split(',').map(s => s.trim()) : [],
             atms: typeof item.atms === 'string' ? item.atms.split(',').map(s => s.trim()) : [],
        },
        images: typeof item.images === 'string' ? item.images.split(',').map(s => s.trim()) : [],
        availability_status: item.availability_status || "Available",
        is_active: true,
        availability_date: parseDate(item.availability_date),
        assigned_agent: agentId,
        additionalContacts: [{
            name: item.additionalContactName,
            phone: item.additionalContactPhone,
            email: item.additionalContactEmail,
            role: item.additionalContactRole,
        }],
        internal_notes: item.internal_notes,
      };

      dataToInsert.push(processedItem);
      existingBuildingNames.add(buildingName.toLowerCase());
    }

    if (dataToInsert.length > 0) {
      await OfficeSpaceModel.insertMany(dataToInsert);
    }

    return NextResponse.json({
        message: "Excel file processed successfully.",
        success: true,
        results: {
            successfullyInserted: dataToInsert.length,
            duplicatesFound: duplicatesFound.length,
            failedEntries: failedEntries.length,
            duplicates: duplicatesFound,
            failed: failedEntries
        }
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating office spaces from Excel:", error);
    return NextResponse.json(
      { message: "An error occurred while processing the Excel file.", error: error.message },
      { status: 500 }
    );
  }
}