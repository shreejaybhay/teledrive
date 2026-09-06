import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Node from "@/models/Node";

// Get all files/folders for a user (optionally filtered by parentId)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("ownerId");
    const parentId = searchParams.get("parentId") || null; // null means root

    if (!ownerId) {
      return NextResponse.json({ error: "Missing ownerId" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Find all nodes for this user in the specified folder (or root)
    const nodes = await Node.find({ ownerId, parentId }).sort({ type: -1, updatedAt: -1 });

    return NextResponse.json({ nodes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create a new file or folder
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, parentId, ownerId, telegramMessageId, size, mimeType } = body;

    if (!name || !type || !ownerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    const newNode = new Node({
      name,
      type,
      parentId: parentId || null,
      ownerId,
      telegramMessageId,
      size,
      mimeType
    });

    const savedNode = await newNode.save();

    // If this is a file uploaded inside a folder, bump the folder's updatedAt timestamp
    if (parentId && type === "file") {
      await Node.findByIdAndUpdate(parentId, { $set: { updatedAt: new Date() } });
    }

    return NextResponse.json({ node: savedNode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Rename a file or folder
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { nodeId, newName, ownerId } = body;

    if (!nodeId || !newName || !ownerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify ownership and update name
    const updatedNode = await Node.findOneAndUpdate(
      { _id: nodeId, ownerId },
      { name: newName.trim() },
      { new: true }
    );

    if (!updatedNode) {
      return NextResponse.json({ error: "Node not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ node: updatedNode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete a file or folder (and ALL descendants recursively)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId");
    const ownerId = searchParams.get("ownerId");

    if (!nodeId || !ownerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify ownership first
    const node = await Node.findOne({ _id: nodeId, ownerId });
    if (!node) {
      return NextResponse.json({ error: "Node not found or unauthorized" }, { status: 404 });
    }

    // Recursively collect all descendant node IDs and their Telegram message IDs
    const allNodeIds: string[] = [nodeId];
    const telegramMessageIds: number[] = [];

    if (node.telegramMessageId) telegramMessageIds.push(node.telegramMessageId);

    const collectDescendants = async (parentId: string) => {
      const children = await Node.find({ parentId, ownerId });
      for (const child of children) {
        allNodeIds.push(child._id.toString());
        if (child.telegramMessageId) telegramMessageIds.push(child.telegramMessageId);
        if (child.type === "folder") {
          await collectDescendants(child._id.toString());
        }
      }
    };

    if (node.type === "folder") {
      await collectDescendants(nodeId);
    }

    // Delete all collected nodes from MongoDB in one shot
    await Node.deleteMany({ _id: { $in: allNodeIds }, ownerId });

    // Return telegramMessageIds so client can delete them from Telegram
    return NextResponse.json({ success: true, telegramMessageIds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
