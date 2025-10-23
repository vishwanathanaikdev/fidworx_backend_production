// app/api/(managedOffice)/generate-ppt/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import PptxGenJS from "pptxgenjs";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
const xkey = process.env.API_AUTH_KEY;

// Helper to fetch an image and convert it to a base64 data URL
const imageUrlToBase64 = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${url}, status: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = response.headers.get("content-type") || "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error converting image to base64: ${url}`, error);
    return null;
  }
};

// Helper to fetch property data
async function getManagedOfficeById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectdb();
  return await ManagedOfficeModel.findById(id).lean();
}

// Main API route handler
export async function GET(req) {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("id");

    if (xkey !== reqApiKey) {
      return new NextResponse(JSON.stringify({ success: false, message: "Invalid API Auth Key" }), { status: 401 });
    }
    if (!propertyId) {
      return new NextResponse(JSON.stringify({ success: false, message: "Property ID is required" }), { status: 400 });
    }
    const property = await getManagedOfficeById(propertyId);
    if (!property) {
      return new NextResponse(JSON.stringify({ success: false, message: "Managed office not found" }), { status: 404 });
    }

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_16x9";
    pptx.author = "FidCo Property Portfolio";
    pptx.company = "FidCo";
    pptx.subject = `${property.buildingName} - Property Presentation`;
    pptx.title = property.buildingName || "Managed Office Space";

    const colors = {
        primary: "0F172A",
        secondary: "3B82F6",
        accent: "8B5CF6",
        success: "10B981",
        text: "334155",
        textLight: "64748B",
        subtle: "F1F5F9",
        white: "FFFFFF",
        lightGray: "E2E8F0",
    };

    const SLIDE_WIDTH = 13.33;

    pptx.defineSlideMaster({
        title: "MASTER_SLIDE",
        background: { color: colors.subtle },
        objects: [
            { rect: { x: 0, y: 0, w: '50%', h: 0.5, fill: { color: colors.primary } } },
            { rect: { x: '50%', y: 0, w: '50%', h: 0.5, fill: { color: colors.secondary } } },
            { text: { text: "FidCo Property Portfolio", options: { x: 0.4, y: 0.1, w: 6, h: 0.3, fontSize: 18, bold: true, color: colors.white, fontFace: "Arial" } } },
            { text: { text: `ID: ${property.propertyId || "N/A"}`, options: { x: 11.5, y: 0.1, w: 1.5, h: 0.3, fontSize: 10, bold: true, color: colors.white, align: "right", fontFace: "Arial" } } },
            { line: { x: 0, y: 0.5, w: SLIDE_WIDTH, h: 0, line: { color: colors.accent, width: 2 } } },
        ],
    });

    // --- Slide 1: Title Slide ---
    const slide1 = pptx.addSlide({ masterName: "MASTER_SLIDE" });
    const heroImage = property.images?.[0] ? await imageUrlToBase64(property.images[0]) : null;
    if (heroImage) {
        slide1.addImage({ data: heroImage, x: 0, y: 0.5, w: '100%', h: 4.5, sizing: { type: "cover", w: 13.33, h: 4.5 } });
        slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0.5, w: '100%', h: 4.5, fill: { color: colors.primary, transparency: 40 } });
    }
    slide1.addText(property.buildingName || "Managed Office", { x: 0, y: 2.2, w: '100%', h: 0.8, align: 'center', fontSize: 44, bold: true, color: colors.white, fontFace: "Arial", shadow: { type: "outer", color: "000000", blur: 5, offset: 3, opacity: 0.5 } });
    slide1.addText(`${property.location?.address || ""}, ${property.location?.city || ""}`, { x: 0, y: 3.1, w: '100%', h: 0.5, align: 'center', fontSize: 16, color: colors.white, fontFace: "Arial" });
    slide1.addText("✓ Available", { x: 0, y: 3.6, w: '100%', align: 'center', fontSize: 14, color: colors.white, bold: true });

    // --- Slide 2: Executive Summary ---
    const slide2 = pptx.addSlide({ masterName: "MASTER_SLIDE" });
    slide2.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.9, w: 0.1, h: 0.4, fill: { color: colors.secondary } });
    slide2.addText("Executive Summary", { x: 0.6, y: 0.9, w: '90%', h: 0.4, fontSize: 28, bold: true, color: colors.dark, fontFace: "Arial" });
    const summaryData = [
        [{ text: "Seating Capacity", options: { fill: { color: colors.subtle } } }, { text: String(property.generalInfo?.seaterOffered ?? "N/A") }],
        [{ text: "Rent per Seat", options: { fill: { color: colors.subtle } } }, { text: property.generalInfo?.rentPerSeat ?? "N/A" }],
        [{ text: "Furnishing", options: { fill: { color: colors.subtle } } }, { text: property.generalInfo?.furnishingLevel ?? "N/A" }],
        [{ text: "Lock-in Period", options: { fill: { color: colors.subtle } } }, { text: property.generalInfo?.lockInPeriod ?? "N/A" }],
        [{ text: "Power & Backup", options: { fill: { color: colors.subtle } } }, { text: property.generalInfo?.powerAndBackup ?? "N/A" }],
        [{ text: "Area (sq ft)", options: { fill: { color: colors.subtle } } }, { text: String(property.location?.areaSqft ?? "N/A") }],
    ];
    slide2.addTable(summaryData, { x: 0.4, y: 1.6, w: 5.5, colW: [2.5, 3], rowH: 0.45, border: { color: colors.lightGray }, fontSize: 12, fontFace: "Arial", valign: "middle", color: colors.text });

    // Slide 3: Amenities
    const slide3 = pptx.addSlide({ masterName: "MASTER_SLIDE" });
    slide3.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.9, w: 0.1, h: 0.4, fill: { color: colors.accent } });
    slide3.addText("Amenities & Features", { x: 0.6, y: 0.9, w: '90%', h: 0.4, fontSize: 28, bold: true, color: colors.dark, fontFace: "Arial" });

    let amenitiesList = Object.entries(property.amenities || {})
        .filter(([, value]) => value === true)
        .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
    if (property.amenities?.parking) amenitiesList.unshift(`Parking: ${property.amenities.parking}`);
    
    // Create 3 columns for amenities
    const amenCol1 = amenitiesList.slice(0, 8);
    const amenCol2 = amenitiesList.slice(8, 16);
    const amenCol3 = amenitiesList.slice(16, 24);

    if (amenCol1.length > 0) slide3.addText(amenCol1.map(item => `• ${item}`).join('\n'), { x: 0.5, y: 1.6, w: 4, h: 5, fontSize: 12, fontFace: "Arial", color: colors.text });
    if (amenCol2.length > 0) slide3.addText(amenCol2.map(item => `• ${item}`).join('\n'), { x: 4.66, y: 1.6, w: 4, h: 5, fontSize: 12, fontFace: "Arial", color: colors.text });
    if (amenCol3.length > 0) slide3.addText(amenCol3.map(item => `• ${item}`).join('\n'), { x: 8.82, y: 1.6, w: 4, h: 5, fontSize: 12, fontFace: "Arial", color: colors.text });

    // Slide 4: Location
    const slide4 = pptx.addSlide({ masterName: "MASTER_SLIDE" });
    slide4.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.9, w: 0.1, h: 0.4, fill: { color: colors.success } });
    slide4.addText("Location & Connectivity", { x: 0.6, y: 0.9, w: '90%', h: 0.4, fontSize: 28, bold: true, color: colors.dark, fontFace: "Arial" });
    // ... Add detailed location and transit info similar to the summary slide
    
    // Slide 5: Gallery
    const galleryImages = (property.images || []).slice(1, 7);
    if (galleryImages.length > 0) {
        const slide5 = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        slide5.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.9, w: 0.1, h: 0.4, fill: { color: colors.warning } });
        slide5.addText("Property Gallery", { x: 0.6, y: 0.9, w: '90%', h: 0.4, fontSize: 28, bold: true, color: colors.dark, fontFace: "Arial" });
        
        const imagePromises = galleryImages.map(imageUrlToBase64);
        const base64Images = await Promise.all(imagePromises);

        const positions = [
            { x: 0.4, y: 1.5, w: 6.2, h: 3.5 },
            { x: 6.8, y: 1.5, w: 6.1, h: 1.65 },
            { x: 6.8, y: 3.35, w: 6.1, h: 1.65 },
        ];
        
        base64Images.slice(0,3).forEach((imgData, i) => {
            if (imgData && positions[i]) {
                slide5.addImage({ data: imgData, ...positions[i], sizing: { type: 'cover', ...positions[i] } });
            }
        });
    }

    // --- 4. Generate and Send File ---
     const pptBuffer = await pptx.write("arraybuffer");
    
    const responseHeaders = new Headers();
    responseHeaders.append("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    responseHeaders.append("Content-Disposition", `attachment; filename="${(property.buildingName || "property").replace(/[\\/:*?"<>|]+/g, "_")}.pptx"`);

    return new Response(pptBuffer, { headers: responseHeaders });

  } catch (error) {
    console.error("Error generating PPT:", error);
    return new NextResponse(JSON.stringify({ success: false, message: "Internal Server Error" }), { status: 500 });
  }
}