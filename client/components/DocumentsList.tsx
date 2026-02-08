import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, Table, Plus, Trash2, MoreVertical, Loader2, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import Papa from "papaparse";

interface Document {
  id: number;
  projectId: number;
  name: string;
  type: "document" | "spreadsheet";
  createdAt: string;
  updatedAt: string;
}

interface DocumentsListProps {
  projectId: number;
}

export default function DocumentsList({ projectId }: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDocMenu, setShowNewDocMenu] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"document" | "spreadsheet">("document");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api(`/api/documents/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      
      // Create a new document with the imported content
      const response = await api("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          type: "document",
        }),
      });

      if (response.ok) {
        const newDoc = await response.json();
        
        // Update the document with imported content
        await api(`/api/documents/${newDoc.id}`, {
          method: "PUT",
          body: JSON.stringify({
            content: JSON.stringify({ content: text }),
          }),
        });
        
        setDocuments([newDoc, ...documents]);
        alert(`Successfully imported "${file.name}"`);
      }
    } catch (error) {
      console.error("Error importing file:", error);
      alert("Error importing file. Please try again.");
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleSpreadsheetImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      Papa.parse(file, {
        complete: async (results) => {
          try {
            // Convert CSV data to cell format
            const cells: any = {};
            results.data.forEach((row: any, rowIndex: number) => {
              row.forEach((cell: any, colIndex: number) => {
                if (cell) {
                  const col = String.fromCharCode(65 + colIndex);
                  const cellKey = `${col}${rowIndex + 1}`;
                  cells[cellKey] = cell;
                }
              });
            });

            // Create spreadsheet
            const response = await api("/api/documents", {
              method: "POST",
              body: JSON.stringify({
                projectId,
                name: file.name.replace(/\.[^/.]+$/, ""),
                type: "spreadsheet",
              }),
            });

            if (response.ok) {
              const newDoc = await response.json();
              
              // Update with imported data
              await api(`/api/documents/${newDoc.id}`, {
                method: "PUT",
                body: JSON.stringify({
                  content: JSON.stringify({ cells }),
                }),
              });
              
              setDocuments([newDoc, ...documents]);
              alert(`Successfully imported "${file.name}"`);
            }
          } catch (error) {
            console.error("Error processing CSV:", error);
            alert("Error processing CSV file.");
          } finally {
            setIsImporting(false);
          }
        },
        error: (error) => {
          console.error("CSV parsing error:", error);
          alert("Error parsing CSV file.");
          setIsImporting(false);
        },
      });
      
      // Reset file input
      event.target.value = "";
    } catch (error) {
      console.error("Error importing spreadsheet:", error);
      alert("Error importing spreadsheet.");
      setIsImporting(false);
    }
  };

  const createDocument = async (type: "document" | "spreadsheet") => {
    try {
      setIsCreating(true);
      const response = await api("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          name: type === "document" ? "Untitled Document" : "Untitled Spreadsheet",
          type,
        }),
      });

      if (response.ok) {
        const newDoc = await response.json();
        setDocuments([newDoc, ...documents]);
        setShowNewDocMenu(false);
      }
    } catch (error) {
      console.error("Error creating document:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await api(`/api/documents/${docId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments(documents.filter((doc) => doc.id !== docId));
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    };
  };

  const filteredDocuments = documents.filter((doc) => doc.type === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("document")}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 -mb-px ${
            activeTab === "document"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents
        </button>
        <button
          onClick={() => setActiveTab("spreadsheet")}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 -mb-px ${
            activeTab === "spreadsheet"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          <Table className="w-4 h-4" />
          Spreadsheets
        </button>
      </div>

      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {activeTab === "document" ? "Text Documents" : "Spreadsheets"}
        </h2>
        <div className="flex items-center gap-2">
          {/* Import Button */}
          <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors cursor-pointer disabled:opacity-50 border border-border">
            <input
              type="file"
              accept={activeTab === "document" ? ".txt,.md,.doc,.docx" : ".csv,.xlsx"}
              onChange={activeTab === "document" ? handleFileImport : handleSpreadsheetImport}
              disabled={isImporting}
              className="hidden"
            />
            {isImporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            Import {activeTab === "spreadsheet" ? "CSV" : ""}
          </label>
          
          {/* Create New Button */}
          <button
            onClick={() => createDocument(activeTab)}
            disabled={isCreating}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            New {activeTab === "document" ? "Document" : "Spreadsheet"}
          </button>

        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary rounded-full mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No {activeTab === "document" ? "documents" : "spreadsheets"} yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Create your first {activeTab === "document" ? "document" : "spreadsheet"} to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative"
            >
              <Link
                to={`/project/${projectId}/${doc.type}/${doc.id}`}
                className="block bg-card border border-border rounded-lg p-4 hover:border-primary transition-all hover:shadow-md"
              >
                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${
                    doc.type === "document"
                      ? "bg-blue-100 dark:bg-blue-950"
                      : "bg-green-100 dark:bg-green-950"
                  }`}
                >
                  {doc.type === "document" ? (
                    <FileText
                      className={`w-6 h-6 ${
                        doc.type === "document"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    />
                  ) : (
                    <Table className="w-6 h-6 text-green-600 dark:text-green-400" />
                  )}
                </div>

                {/* Name */}
                <h3 className="font-semibold text-foreground mb-1 truncate">
                  {doc.name}
                </h3>

                {/* Meta */}
                <p className="text-sm text-muted-foreground">
                  Updated {formatDate(doc.updatedAt)}
                </p>
              </Link>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  deleteDocument(doc.id);
                }}
                className="absolute top-2 right-2 p-2 bg-card border border-border rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
