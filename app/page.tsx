"use client";

import Image from "next/image";
import { useState, FormEvent, ChangeEvent, useRef } from "react";

interface RequestLog {
  step: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  responseStatus: number;
  responseStatusText: string;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  durationMs: number;
  timestamp: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
  logs: RequestLog[];
  totalDurationMs: number;
}

// Viatura mapping - Guarnição number to internal ID
const VIATURAS = [
  { id: "355067", name: "Guarnição 01", number: "01" },
  { id: "356052", name: "Guarnição 02", number: "02" },
  { id: "356053", name: "Guarnição 03", number: "03" },
  { id: "356054", name: "Guarnição 04", number: "04" },
  { id: "356055", name: "Guarnição 05", number: "05" },
  { id: "356056", name: "Guarnição 06", number: "06" },
  { id: "356057", name: "Guarnição 07", number: "07" },
  { id: "356058", name: "Guarnição 08", number: "08" },
  { id: "356059", name: "Guarnição 09", number: "09" },
  { id: "356060", name: "Guarnição 10", number: "10" },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedViaturas, setSelectedViaturas] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleViatura = (id: string) => {
    const newSelected = new Set(selectedViaturas);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedViaturas(newSelected);
  };

  const selectAllViaturas = () => {
    if (selectedViaturas.size === VIATURAS.length) {
      setSelectedViaturas(new Set());
    } else {
      setSelectedViaturas(new Set(VIATURAS.map(v => v.id)));
    }
  };

  const toggleLogExpanded = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (selectedViaturas.size === 0) {
      setStatus("error");
      setStatusMessage("Selecione pelo menos uma viatura.");
      return;
    }

    if (!file && !message.trim()) {
      setStatus("error");
      setStatusMessage("Envie pelo menos um arquivo ou uma mensagem.");
      return;
    }

    setStatus("loading");
    setStatusMessage("");
    setApiResponse(null);
    setExpandedLogs(new Set());

    const viaturaIds = Array.from(selectedViaturas);
    setSendProgress({ current: 0, total: viaturaIds.length });

    const allLogs: RequestLog[] = [];
    let totalDuration = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < viaturaIds.length; i++) {
      const userId = viaturaIds[i];
      const viatura = VIATURAS.find(v => v.id === userId);
      setSendProgress({ current: i + 1, total: viaturaIds.length });

      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("userId", userId);
      formData.append("message", message);

      try {
        const response = await fetch("/api/send-file", {
          method: "POST",
          body: formData,
        });

        const data: ApiResponse = await response.json();

        // Add viatura name to each log step
        if (data.logs) {
          data.logs.forEach(log => {
            log.step = `[${viatura?.name}] ${log.step}`;
            allLogs.push(log);
          });
        }

        totalDuration += data.totalDurationMs || 0;

        if (data.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
        allLogs.push({
          step: `[${viatura?.name}] Erro de conexão`,
          url: "/api/send-file",
          method: "POST",
          requestHeaders: {},
          requestBody: null,
          responseStatus: 0,
          responseStatusText: "Connection Error",
          responseHeaders: {},
          responseBody: null,
          durationMs: 0,
          timestamp: new Date().toISOString(),
        });
      }
    }

    setApiResponse({
      success: errorCount === 0,
      message: `Enviado para ${successCount} viatura(s)${errorCount > 0 ? `, ${errorCount} erro(s)` : ""}`,
      logs: allLogs,
      totalDurationMs: totalDuration,
    });

    if (errorCount === 0) {
      setStatus("success");
      setStatusMessage(`Enviado com sucesso para ${successCount} viatura(s)!`);
      setFile(null);
      setSelectedViaturas(new Set());
      setMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else if (successCount > 0) {
      setStatus("error");
      setStatusMessage(`Enviado para ${successCount} viatura(s), mas ${errorCount} falharam.`);
    } else {
      setStatus("error");
      setStatusMessage("Erro ao enviar para todas as viaturas.");
    }

    setSendProgress({ current: 0, total: 0 });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (["pdf"].includes(ext || "")) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-success";
    if (status >= 400 && status < 500) return "text-amber-600";
    if (status >= 500) return "text-error";
    return "text-text-muted";
  };

  return (
    <div className="min-h-screen badge-pattern relative">
      {/* Decorative header bar */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary-light to-primary" />

      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <header className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-accent/10 rounded-full blur-2xl scale-150" />
            <Image
              src="/logo.png"
              alt="Guarda Municipal de Florianópolis"
              width={120}
              height={120}
              priority
              className="relative drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary tracking-tight">
            Sistema de Mensagens
          </h1>
          <p className="text-text-muted mt-2 text-sm">
            Guarda Municipal de Florianópolis
          </p>
        </header>

        {/* Main Card */}
        <main
          className="bg-surface rounded-2xl shadow-xl shadow-primary/10 border border-border overflow-hidden animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-primary to-primary-light px-6 py-4">
            <h2 className="text-white font-medium flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Enviar Comunicação
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Viatura Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-foreground">
                  Selecionar Viaturas <span className="text-error">*</span>
                </label>
                <button
                  type="button"
                  onClick={selectAllViaturas}
                  className="text-xs font-medium text-primary hover:text-primary-light transition-colors"
                >
                  {selectedViaturas.size === VIATURAS.length ? "Desmarcar todas" : "Selecionar todas"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {VIATURAS.map((viatura) => {
                  const isSelected = selectedViaturas.has(viatura.id);
                  return (
                    <button
                      key={viatura.id}
                      type="button"
                      onClick={() => toggleViatura(viatura.id)}
                      className={`
                        relative p-3 rounded-xl border-2 transition-all duration-200
                        flex flex-col items-center justify-center gap-1
                        ${isSelected
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border bg-input-bg hover:border-primary-lighter hover:bg-background"
                        }
                      `}
                    >
                      {/* Patrol car icon */}
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-colors
                        ${isSelected ? "bg-primary text-white" : "bg-background text-primary"}
                      `}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8m-8 4h8m-4-8v2m-6 6h.01M6 17h.01M18 17h.01M6 13h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 012-2zm1-6l1.5-3h7l1.5 3" />
                        </svg>
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {viatura.number}
                      </span>

                      {/* Checkmark indicator */}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedViaturas.size > 0 && (
                <p className="mt-2 text-xs text-text-muted">
                  {selectedViaturas.size} viatura{selectedViaturas.size > 1 ? "s" : ""} selecionada{selectedViaturas.size > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Arquivo
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                  transition-all duration-200 bg-input-bg
                  ${isDragging
                    ? "border-primary bg-primary/5"
                    : "border-input-border hover:border-primary hover:bg-background"
                  }
                  ${file ? "border-success bg-success-bg/50" : ""}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!file ? (
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm text-text-muted">
                      <span className="font-medium text-primary">Clique para selecionar</span> ou arraste um arquivo
                    </p>
                    <p className="text-xs text-text-subtle">Qualquer tipo de arquivo</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                          {file.name}
                        </p>
                        <p className="text-xs text-text-muted">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-2 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Message Field */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                Mensagem
              </label>
              <div className="relative">
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem aqui..."
                  rows={4}
                  className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-lg focus-ring transition-all duration-200 placeholder:text-text-subtle text-foreground resize-none"
                />
                <span className="absolute bottom-3 right-3 text-xs text-text-subtle">
                  {message.length} caracteres
                </span>
              </div>
            </div>

            {/* Helper text */}
            <p className="text-xs text-text-muted flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Envie um arquivo, uma mensagem, ou ambos para as viaturas selecionadas
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === "loading"}
              className={`
                w-full py-3.5 px-4 rounded-lg font-medium text-white
                transition-all duration-200 flex items-center justify-center gap-2
                ${status === "loading"
                  ? "animate-shimmer cursor-not-allowed"
                  : "bg-primary hover:bg-primary-light active:scale-[0.98] shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                }
              `}
            >
              {status === "loading" ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {sendProgress.total > 0
                    ? `Enviando ${sendProgress.current}/${sendProgress.total}...`
                    : "Enviando..."
                  }
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Enviar{selectedViaturas.size > 0 ? ` para ${selectedViaturas.size} viatura${selectedViaturas.size > 1 ? "s" : ""}` : ""}
                </>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {status === "success" && (
            <div className="mx-6 mb-6 p-4 bg-success-bg border border-success/30 rounded-lg flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-success-text font-medium">{statusMessage}</p>
            </div>
          )}

          {status === "error" && statusMessage && (
            <div className="mx-6 mb-6 p-4 bg-error-bg border border-error/30 rounded-lg flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-error-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm text-error-text font-medium">{statusMessage}</p>
            </div>
          )}
        </main>

        {/* API Logs Panel */}
        {apiResponse && apiResponse.logs && apiResponse.logs.length > 0 && (
          <div className="mt-6 animate-fade-in">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex items-center justify-between p-4 bg-surface rounded-xl border border-border hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Debug: Logs de Requisições</p>
                  <p className="text-xs text-text-muted">
                    {apiResponse.logs.length} requisições &middot; {apiResponse.totalDurationMs}ms total
                  </p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-text-muted transition-transform ${showLogs ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLogs && (
              <div className="mt-3 space-y-3">
                {apiResponse.logs.map((log, index) => (
                  <div
                    key={index}
                    className="bg-surface rounded-xl border border-border overflow-hidden"
                  >
                    <button
                      onClick={() => toggleLogExpanded(index)}
                      className="w-full p-4 flex items-center justify-between hover:bg-background/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${getStatusColor(log.responseStatus)} bg-current/10`}>
                          {log.responseStatus}
                        </span>
                        <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                          {log.method}
                        </span>
                        <span className="text-sm font-medium text-foreground">{log.step}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted">{log.durationMs}ms</span>
                        <svg
                          className={`w-4 h-4 text-text-muted transition-transform ${expandedLogs.has(index) ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {expandedLogs.has(index) && (
                      <div className="border-t border-border p-4 space-y-4 bg-background/50">
                        {/* URL */}
                        <div>
                          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">URL</p>
                          <p className="text-sm font-mono text-foreground break-all bg-surface p-2 rounded border border-border">
                            {log.url}
                          </p>
                        </div>

                        {/* Timestamp */}
                        <div>
                          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Timestamp</p>
                          <p className="text-sm font-mono text-foreground">{log.timestamp}</p>
                        </div>

                        {/* Request Headers */}
                        <div>
                          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Request Headers</p>
                          <pre className="text-xs font-mono text-foreground bg-surface p-3 rounded border border-border overflow-x-auto">
                            {JSON.stringify(log.requestHeaders, null, 2)}
                          </pre>
                        </div>

                        {/* Request Body */}
                        <div>
                          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Request Body</p>
                          <pre className="text-xs font-mono text-foreground bg-surface p-3 rounded border border-border overflow-x-auto max-h-48">
                            {JSON.stringify(log.requestBody, null, 2)}
                          </pre>
                        </div>

                        {/* Response Status */}
                        <div>
                          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Response Status</p>
                          <p className={`text-sm font-mono font-medium ${getStatusColor(log.responseStatus)}`}>
                            {log.responseStatus} {log.responseStatusText}
                          </p>
                        </div>

                        {/* Response Headers */}
                        <div>
                          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Response Headers</p>
                          <pre className="text-xs font-mono text-foreground bg-surface p-3 rounded border border-border overflow-x-auto max-h-48">
                            {JSON.stringify(log.responseHeaders, null, 2)}
                          </pre>
                        </div>

                        {/* Response Body */}
                        <div>
                          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Response Body</p>
                          <pre className="text-xs font-mono text-foreground bg-surface p-3 rounded border border-border overflow-x-auto max-h-64">
                            {JSON.stringify(log.responseBody, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <p className="text-xs text-text-muted">
            Sistema UNA &middot; Guarda Municipal de Florianópolis
          </p>
        </footer>
      </div>
    </div>
  );
}
