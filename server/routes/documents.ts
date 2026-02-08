import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/authorize';

/**
 * GET /api/documents/:projectId
 * Get all documents for a project
 */
export const getDocuments: RequestHandler = async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectIdInt = parseInt(Array.isArray(projectId) ? projectId[0] : projectId);

    const documents = await prisma.document.findMany({
      where: { projectId: projectIdInt },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

/**
 * GET /api/documents/file/:documentId
 * Get a specific document
 */
export const getDocument: RequestHandler = async (req, res) => {
  try {
    const { documentId } = req.params;
    const documentIdInt = parseInt(Array.isArray(documentId) ? documentId[0] : documentId);

    const document = await prisma.document.findUnique({
      where: { id: documentIdInt },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

/**
 * POST /api/documents
 * Create a new document
 */
export const createDocument: RequestHandler = async (req, res) => {
  try {
    const { projectId, name, type } = req.body;
    const authReq = req as AuthRequest;
    const userId = parseInt(authReq.userId || '0');

    if (!projectId || !name || !type) {
      return res.status(400).json({ error: 'Project ID, name, and type are required' });
    }

    if (type !== 'document' && type !== 'spreadsheet') {
      return res.status(400).json({ error: 'Type must be "document" or "spreadsheet"' });
    }

    const document = await prisma.document.create({
      data: {
        projectId: parseInt(projectId),
        name,
        type,
        content: type === 'spreadsheet' ? JSON.stringify({ cells: {} }) : JSON.stringify({ content: '' }),
        createdBy: userId,
      },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
};

/**
 * PUT /api/documents/:documentId
 * Update a document
 */
export const updateDocument: RequestHandler = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { name, content } = req.body;
    const documentIdInt = parseInt(Array.isArray(documentId) ? documentId[0] : documentId);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) {
      // Ensure content is a string
      updateData.content = typeof content === 'string' ? content : JSON.stringify(content);
    }

    const document = await prisma.document.update({
      where: { id: documentIdInt },
      data: updateData,
    });

    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

/**
 * DELETE /api/documents/:documentId
 * Delete a document
 */
export const deleteDocument: RequestHandler = async (req, res) => {
  try {
    const { documentId } = req.params;
    const documentIdInt = parseInt(Array.isArray(documentId) ? documentId[0] : documentId);

    await prisma.document.delete({
      where: { id: documentIdInt },
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};
