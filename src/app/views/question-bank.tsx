import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    CircleAlert,
    CircleCheck,
    Download,
    Upload,
    Trash2,
    BarChart3,
} from "lucide-react";
import type { QuestionBankEntry } from "../lib/questionBank";
import type { AppSettings, SetAppSettings } from "../page";

interface QuestionBankPageProps {
    questionBank: QuestionBankEntry[];
    setQuestionBank: (bank: QuestionBankEntry[]) => void;
    settings: AppSettings;
    setSettings: SetAppSettings;
}

export function QuestionBankPage({
    questionBank,
    setQuestionBank,
    settings,
    setSettings,
}: QuestionBankPageProps) {
    const [showAnswered, setShowAnswered] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const unanswered = questionBank.filter((q) => !q.answer);
    const answered = questionBank.filter((q) => q.answer);
    const fillRate =
        questionBank.length > 0
            ? Math.round((answered.length / questionBank.length) * 100)
            : 0;

    const handleSaveAnswer = (id: string, answer: string) => {
        if (!answer.trim()) return;
        const updated = questionBank.map((q) =>
            q.id === id ? { ...q, answer: answer.trim() } : q
        );
        setQuestionBank(updated);
        setEditingId(null);
        setEditValue("");
    };

    const handleDeleteQuestion = (id: string) => {
        setQuestionBank(questionBank.filter((q) => q.id !== id));
    };

    const handleStartEdit = (entry: QuestionBankEntry) => {
        setEditingId(entry.id);
        setEditValue(entry.answer || "");
    };

    const handleExport = () => {
        const data = JSON.stringify(questionBank, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `naukri-question-bank-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported: QuestionBankEntry[] = JSON.parse(
                    event.target?.result as string
                );
                if (!Array.isArray(imported)) throw new Error("Invalid format");

                // Merge: add new entries, skip duplicates by ID
                const existingIds = new Set(questionBank.map((q) => q.id));
                const newEntries = imported.filter((q) => !existingIds.has(q.id));
                setQuestionBank([...questionBank, ...newEntries]);
                alert(`Imported ${newEntries.length} new questions. ${imported.length - newEntries.length} duplicates skipped.`);
            } catch {
                alert("Invalid file format. Please use a valid Question Bank JSON file.");
            }
        };
        reader.readAsText(file);
        // Reset the file input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const renderInputForQuestion = (entry: QuestionBankEntry) => {
        const isEditing = editingId === entry.id;

        if (entry.inputType === "dropdown" || entry.inputType === "radio") {
            // Render selectable options
            return (
                <div className="space-y-2">
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">
                        {entry.inputType === "dropdown" ? "Select one:" : "Choose one:"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {entry.options?.map((option) => (
                            <button
                                key={option}
                                onClick={() => handleSaveAnswer(entry.id, option)}
                                className={`px-3 py-1.5 text-xs rounded border transition-colors ${entry.answer === option
                                        ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                                        : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300"
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        // Text input
        if (isEditing || !entry.answer) {
            return (
                <div className="flex gap-2">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveAnswer(entry.id, editValue);
                            if (e.key === "Escape") { setEditingId(null); setEditValue(""); }
                        }}
                        placeholder="Type your answer..."
                        className="bg-neutral-950 border-neutral-700 text-sm flex-1"
                        autoFocus
                    />
                    <Button
                        size="sm"
                        onClick={() => handleSaveAnswer(entry.id, editValue)}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                    >
                        Save
                    </Button>
                </div>
            );
        }

        // Display saved answer with edit option
        return (
            <div className="flex items-center justify-between">
                <span className="text-sm text-green-400">{entry.answer}</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(entry)}
                    className="text-xs text-neutral-500 hover:text-neutral-300"
                >
                    Edit
                </Button>
            </div>
        );
    };

    const renderQuestionCard = (entry: QuestionBankEntry) => (
        <div
            key={entry.id}
            className="p-4 border border-neutral-800 rounded-lg space-y-3 bg-neutral-950/50"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                    <p className="text-sm text-neutral-200">{entry.originalText}</p>
                    <div className="flex items-center gap-3 text-xs text-neutral-600">
                        <span className="uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                            {entry.inputType}
                        </span>
                        <span>Matched {entry.matchCount}x</span>
                        <span>Added {new Date(entry.addedOn).toLocaleDateString()}</span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteQuestion(entry.id)}
                    className="h-7 w-7 text-neutral-600 hover:text-red-400 shrink-0"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
            {renderInputForQuestion(entry)}
        </div>
    );

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full custom-scrollbar">
            {/* Stats Bar */}
            <Card className="bg-neutral-900 border-neutral-800">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-orange-500" />
                                <span className="text-sm text-neutral-300">
                                    <span className="text-white font-bold">{questionBank.length}</span> Learned
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CircleAlert className="w-4 h-4 text-red-400" />
                                <span className="text-sm text-neutral-300">
                                    <span className="text-red-400 font-bold">{unanswered.length}</span> Unanswered
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CircleCheck className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-neutral-300">
                                    <span className="text-green-400 font-bold">{fillRate}%</span> Fill Rate
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 mr-4 p-2 border border-neutral-800 rounded">
                                <Label htmlFor="auto-fill-toggle" className="text-xs text-neutral-400 whitespace-nowrap">
                                    Auto-Fill
                                </Label>
                                <Switch
                                    id="auto-fill-toggle"
                                    checked={settings.autoFillEnabled ?? false}
                                    onCheckedChange={(checked) =>
                                        setSettings((prev) => ({ ...prev, autoFillEnabled: checked }))
                                    }
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                disabled={questionBank.length === 0}
                                className="border-neutral-700 text-neutral-400 hover:text-white text-xs gap-1"
                            >
                                <Download className="w-3.5 h-3.5" /> Export
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="border-neutral-700 text-neutral-400 hover:text-white text-xs gap-1"
                            >
                                <Upload className="w-3.5 h-3.5" /> Import
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="hidden"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Empty State */}
            {questionBank.length === 0 && (
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardContent className="p-8 text-center">
                        <BookOpen className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                        <h3 className="text-neutral-300 font-medium mb-2">Question Bank is Empty</h3>
                        <p className="text-sm text-neutral-500 max-w-md mx-auto">
                            Run a mission and the agent will automatically learn questions from Naukri questionnaire sidebars.
                            Come back here to answer them, and the agent will auto-fill them next time!
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Unanswered Questions */}
            {unanswered.length > 0 && (
                <Card className="bg-neutral-900 border-red-500/20">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-red-400 tracking-wider flex items-center gap-2">
                            <CircleAlert className="w-4 h-4" />
                            UNANSWERED ({unanswered.length})
                            <span className="text-xs font-normal text-neutral-500 ml-2">
                                Answer these to enable auto-fill for matching jobs
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {unanswered.map(renderQuestionCard)}
                    </CardContent>
                </Card>
            )}

            {/* Answered Questions */}
            {answered.length > 0 && (
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader
                        className="cursor-pointer"
                        onClick={() => setShowAnswered(!showAnswered)}
                    >
                        <CardTitle className="text-sm font-medium text-green-400 tracking-wider flex items-center gap-2">
                            {showAnswered ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                            <CircleCheck className="w-4 h-4" />
                            ANSWERED ({answered.length})
                        </CardTitle>
                    </CardHeader>
                    {showAnswered && (
                        <CardContent className="space-y-3">
                            {answered.map(renderQuestionCard)}
                        </CardContent>
                    )}
                </Card>
            )}

            <div className="text-right text-xs text-neutral-500">
                <p>Questions are saved automatically. Share your bank with friends via Export!</p>
            </div>
        </div>
    );
}
