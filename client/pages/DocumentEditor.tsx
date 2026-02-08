import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { 
  ArrowLeft, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Save,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import "../styles/editor.css";

interface Document {
  id: number;
  projectId: number;
  name: string;
  type: string;
  content: string;
  updatedAt: string;
}

export default function DocumentEditor() {
  const { projectId, documentId } = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: "Start typing your document...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert focus:outline-none max-w-none p-8",
      },
    },
    onUpdate: ({ editor }) => {
      // Trigger auto-save
      debouncedSave(editor.getHTML());
    },
  });

  // Fetch document
  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) return;
      try {
        setLoading(true);
        const response = await api(`/api/documents/file/${documentId}`);
        if (response.ok) {
          const data = await response.json();
          setDocument(data);
          setDocumentName(data.name);
          
          // Load content into editor
          if (data.content) {
            try {
              const parsed = JSON.parse(data.content);
              if (editor && parsed.content) {
                editor.commands.setContent(parsed.content);
              }
            } catch (e) {
              console.error("Error parsing document content:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        setLoading(false);
      }
    };

    if (editor) {
      fetchDocument();
    }
  }, [documentId, editor]);

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (content: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => saveDocument(content), 2000);
      };
    })(),
    [documentId]
  );

  const saveDocument = async (content?: string) => {
    if (!documentId) return;
    
    setIsSaving(true);
    try {
      const htmlContent = content || editor?.getHTML() || "";
      const response = await api(`/api/documents/${documentId}`, {
        method: "PUT",
        body: JSON.stringify({ 
          content: JSON.stringify({ content: htmlContent }),
          name: documentName
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Error saving document:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateDocumentName = async () => {
    if (!documentId || !documentName.trim()) return;
    
    try {
      await api(`/api/documents/${documentId}`, {
        method: "PUT",
        body: JSON.stringify({ name: documentName }),
      });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating document name:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 z-50 sticky top-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link
            to={`/project/${projectId}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          {/* Document Name */}
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                onBlur={updateDocumentName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateDocumentName();
                  if (e.key === "Escape") {
                    setDocumentName(document?.name || "");
                    setIsEditingName(false);
                  }
                }}
                className="bg-transparent border-none outline-none font-semibold text-foreground w-full"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="font-semibold text-foreground hover:text-primary transition-colors truncate text-left w-full"
              >
                {documentName}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Save Status */}
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : lastSaved ? (
              `Saved ${lastSaved.toLocaleTimeString()}`
            ) : null}
          </div>

          {/* Save Button */}
          <motion.button
            onClick={() => saveDocument()}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Save className="w-4 h-4" />
            Save
          </motion.button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b border-border bg-card p-2 flex items-center gap-1 overflow-x-auto sticky top-14 z-40">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-secondary disabled:opacity-30 transition-colors"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-secondary disabled:opacity-30 transition-colors"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-secondary transition-colors ${
            editor.isActive("heading", { level: 1 }) ? "bg-secondary" : ""
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-secondary transition-colors ${
            editor.isActive("heading", { level: 2 }) ? "bg-secondary" : ""
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-secondary transition-colors ${
            editor.isActive("heading", { level: 3 }) ? "bg-secondary" : ""
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-secondary transition-colors ${
            editor.isActive("bold") ? "bg-secondary" : ""
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-secondary transition-colors ${
            editor.isActive("italic") ? "bg-secondary" : ""
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-secondary transition-colors ${
            editor.isActive("bulletList") ? "bg-secondary" : ""
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-secondary transition-colors ${
            editor.isActive("orderedList") ? "bg-secondary" : ""
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="max-w-4xl mx-auto my-8">
          <div className="bg-card rounded-lg shadow-sm border border-border min-h-[800px] text-foreground">
            <EditorContent editor={editor} className="text-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
