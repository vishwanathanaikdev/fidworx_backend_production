// src/app/api/(managedOffice)/postManagedOfficeDataUsingExcel/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import UserDataModel from "@/app/models/usersDataModel/schema";
import Counter from "@/app/models/counterModel/schema"; // Added Counter model
import mongoose from "mongoose";
import * as xlsx from "xlsx";

/**
 * Robust Excel -> ManagedOffice bulk upload
 * - Normalizes inputs
 * - Returns detailed per-row errors and duplicates
 * - Accepts assigned_agent_email OR assigned_agent (ObjectId)
 * - Aligns with ManagedOffice schema (images max 6, availability_status enum)
 */

// Function to get the next sequence value
async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findByIdAndUpdate(
      sequenceName,
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
  );
  return sequenceDocument.sequence_value;
}

// Allowed enum values (kept in sync with schema). See schema for confirmation.
const ALLOWED_AVAILABILITY = ["Available", "Booked", "Sold Out", "Under Maintenance"];

// Helpers
const createErrorResponse = (status, message, details = null) => {
  return NextResponse.json({ success: false, message, details }, { status });
};

const toBoolean = (v) => {
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(t)) return true;
    if (["false", "no", "n", "0"].includes(t)) return false;
  }
  return Boolean(v);
};

const isValidUrl = (s) => {
  try {
    if (!s || typeof s !== "string") return false;
    const u = new URL(s);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
};

const parseDate = (val) => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const normalizeType = (raw) => {
  if (raw === null || raw === undefined) return { value: null, autoCorrected: false };
  const t = String(raw).trim().toLowerCase();
  if (t === "managed" || t === "manage") return { value: "managed", autoCorrected: t !== "managed" };
  return { value: t, autoCorrected: false };
};

const splitToArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
  return String(val).split(",").map(s => s.trim()).filter(Boolean);
};

const validateImages = (arr) => {
  if (!arr) return { ok: true, images: [] };
  const images = Array.isArray(arr) ? arr : String(arr).split(",").map(s => s.trim()).filter(Boolean);
  if (images.length > 6) return { ok: false, reason: "More than 6 images provided" };
  for (const img of images) {
    if (!isValidUrl(img)) return { ok: false, reason: `Invalid image URL: '${img}'` };
  }
  return { ok: true, images };
};

export async function POST(request) {
  try {
    await connectdb();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return createErrorResponse(400, "No file uploaded. Use form field named 'file'.");
    }

    let workbook;
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
    } catch (err) {
      console.error("Excel parse error:", err);
      return createErrorResponse(400, "Failed to parse uploaded Excel file.", { error: err.message });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return createErrorResponse(400, "Uploaded Excel has no sheets.");

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

    if (!Array.isArray(rows) || rows.length === 0) {
      return createErrorResponse(400, "The Excel file is empty or could not be processed.");
    }

    const users = await UserDataModel.find({}, "email _id").lean();
    const agentEmailToId = new Map(users.map(u => [String(u.email || "").toLowerCase(), u._id]));

    const existing = await ManagedOfficeModel.find({}, "buildingName").lean();
    const existingNamesSet = new Set(existing.map(e => String(e.buildingName || "").toLowerCase()));

    const duplicatesFound = [];
    const failedEntries = [];
    const dataToInsert = [];
    const seenInFile = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;
      const buildingName = row.buildingName ? String(row.buildingName).trim() : "";
      const rawType = row.type;
      const assignedAgentEmail = row.assigned_agent_email ? String(row.assigned_agent_email).trim().toLowerCase() : "";
      const assignedAgentIdField = row.assigned_agent ? String(row.assigned_agent).trim() : null;

      if (!buildingName) {
        failedEntries.push({ row: rowNumber, buildingName: null, reason: "Missing buildingName" });
        continue;
      }

      const { value: normalizedType } = normalizeType(rawType);
      if (normalizedType !== "managed") {
        failedEntries.push({ row: rowNumber, buildingName, reason: `Invalid office type '${rawType}'. Expected 'managed'.` });
        continue;
      }

      if (existingNamesSet.has(buildingName.toLowerCase())) {
        duplicatesFound.push({ row: rowNumber, buildingName, reason: "Building already exists (DB)" });
        continue;
      }
      if (seenInFile.has(buildingName.toLowerCase())) {
        duplicatesFound.push({ row: rowNumber, buildingName, reason: "Duplicate within uploaded file" });
        continue;
      }

      let agentId = null;
      if (assignedAgentEmail) agentId = agentEmailToId.get(assignedAgentEmail);
      if (!agentId && assignedAgentIdField) {
        try {
          const maybeId = mongoose.Types.ObjectId.isValid(assignedAgentIdField) ? new mongoose.Types.ObjectId(assignedAgentIdField) : null;
          if (maybeId) agentId = maybeId;
        } catch {}
      }
      if (!agentId) {
        failedEntries.push({ row: rowNumber, buildingName, reason: `Assigned agent not found. Provide valid assigned_agent_email or assigned_agent (ObjectId).` });
        continue;
      }

      let availability_status = row.availability_status ? String(row.availability_status).trim() : "Available";
      if (!ALLOWED_AVAILABILITY.includes(availability_status)) {
        const candidate = availability_status.charAt(0).toUpperCase() + availability_status.slice(1).toLowerCase();
        if (ALLOWED_AVAILABILITY.includes(candidate)) {
          availability_status = candidate;
        } else {
          failedEntries.push({ row: rowNumber, buildingName, reason: `Invalid availability_status '${row.availability_status}'. Allowed: ${ALLOWED_AVAILABILITY.join(", ")}` });
          continue;
        }
      }

      const imagesValidation = validateImages(row.images);
      if (!imagesValidation.ok) {
        failedEntries.push({ row: rowNumber, buildingName, reason: imagesValidation.reason });
        continue;
      }
      
      const propertyId = `P${await getNextSequenceValue("propertyId")}`; // ✅ FIX: Generate Property ID

      const doc = {
        propertyId, // ✅ FIX: Add Property ID to the document
        buildingName,
        type: "managed",
        generalInfo: {
          seaterOffered: row.seaterOffered !== null && row.seaterOffered !== undefined ? Number(row.seaterOffered) : undefined,
          rentPerSeat: row.rentPerSeat ? String(row.rentPerSeat) : undefined,
          powerAndBackup: row.powerAndBackup ? String(row.powerAndBackup) : undefined,
          ocAvailability: toBoolean(row.ocAvailability),
          lockInPeriod: row.lockInPeriod ? String(row.lockInPeriod) : undefined,
          furnishingLevel: row.furnishingLevel ? String(row.furnishingLevel) : undefined,
        },
        amenities: {
          parking: row.parking ? String(row.parking) : undefined,
          chairsDesks: toBoolean(row.chairsDesks),
          washrooms: row.washrooms ? String(row.washrooms) : undefined,
          meetingRooms: toBoolean(row.meetingRooms),
          security: toBoolean(row.security),
          pantryArea: toBoolean(row.pantryArea),
          firstAidKit: toBoolean(row.firstAidKit),
          fireExtinguisher: toBoolean(row.fireExtinguisher),
          airConditioners: toBoolean(row.airConditioners),
          powerBackup: toBoolean(row.powerBackup),
          receptionArea: toBoolean(row.receptionArea),
          recreationArea: toBoolean(row.recreationArea),
          privateCabin: toBoolean(row.privateCabin),
          wifi: toBoolean(row.wifi),
        },
        location: {
          address: row.address ? String(row.address) : undefined,
          city: row.city ? String(row.city) : undefined,
          zone: row.zone ? String(row.zone) : undefined,
          locationOfProperty: row.locationOfProperty ? String(row.locationOfProperty) : undefined,
          link: row.link ? String(row.link) : undefined,
          areaSqft: row.areaSqft ? Number(row.areaSqft) : undefined,
        },
        transit: {
          metroStations: splitToArray(row.metroStations),
          busStations: splitToArray(row.busStations),
          trainStations: splitToArray(row.trainStations),
          airports: splitToArray(row.airports),
        },
        publicFacilities: {
          hospitals: splitToArray(row.hospitals || row.hospital),
          restaurants: splitToArray(row.restaurants),
          atms: splitToArray(row.atms),
        },
        images: imagesValidation.images,
        availability_status,
        is_active: (row.is_active === null || row.is_active === undefined) ? true : toBoolean(row.is_active),
        availability_date: parseDate(row.availability_date),
        assigned_agent: agentId,
        additionalContacts: (row.additionalContactName || row.additionalContactPhone || row.additionalContactEmail || row.additionalContactRole) ? [{
          name: row.additionalContactName ? String(row.additionalContactName) : undefined,
          phone: row.additionalContactPhone ? String(row.additionalContactPhone) : undefined,
          email: row.additionalContactEmail ? String(row.additionalContactEmail) : undefined,
          role: row.additionalContactRole ? String(row.additionalContactRole) : undefined
        }] : [],
        internal_notes: row.internal_notes ? String(row.internal_notes) : undefined
      };

      dataToInsert.push(doc);
      seenInFile.add(buildingName.toLowerCase());
      existingNamesSet.add(buildingName.toLowerCase());
    }

    let insertedCount = 0;
    try {
      if (dataToInsert.length > 0) {
        const inserted = await ManagedOfficeModel.insertMany(dataToInsert, { ordered: false });
        insertedCount = inserted.length;
      }
    } catch (dbErr) {
      console.error("DB insert error:", dbErr);
      return NextResponse.json({
        success: false,
        message: "Database error during insertMany.",
        details: { name: dbErr.name, message: dbErr.message },
        results: {
          successfullyInserted: insertedCount,
          duplicatesFound: duplicatesFound.length,
          failedEntries: failedEntries.length,
          duplicates: duplicatesFound,
          failed: failedEntries
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Excel file processed.",
      results: {
        successfullyInserted: insertedCount,
        duplicatesFound: duplicatesFound.length,
        failedEntries: failedEntries.length,
        duplicates: duplicatesFound,
        failed: failedEntries
      }
    }, { status: 201 });

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ success: false, message: "An error occurred while processing the Excel file.", error: err.message }, { status: 500 });
  }
}