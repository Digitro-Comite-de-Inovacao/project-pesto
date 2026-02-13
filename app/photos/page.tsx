"use client";

import { useState, FormEvent } from "react";

interface EmployeeArea {
  area: string;
  subArea?: string;
}

interface EmployeeResult {
  id?: string;
  name: string;
  email?: string;
  extension?: string;
  areas?: EmployeeArea[];
  photoUrl?: string;
  photoBase64?: string;
}

interface SearchResponse {
  query: string;
  total: number;
  results: EmployeeResult[];
}

type Status = "idle" | "loading" | "success" | "empty" | "error";

export default function PhotosPage() {
  const [searchName, setSearchName] = useState("");
  const [results, setResults] = useState<EmployeeResult[]>([]);
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();

    if (!searchName.trim()) return;

    setStatus("loading");
    setErrorMessage("");
    setResults([]);
    setBrokenImages(new Set());

    try {
      const response = await fetch(
        `/api/search-photos?name=${encodeURIComponent(searchName.trim())}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Erro ${response.status}`);
      }

      const data: SearchResponse = await response.json();
      setQuery(data.query);
      setTotal(data.total);
      setResults(data.results);
      setStatus(data.results.length > 0 ? "success" : "empty");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Erro ao buscar fotos"
      );
    }
  };

  const getPhotoSrc = (employee: EmployeeResult): string | null => {
    if (employee.photoBase64) {
      return `data:image/jpeg;base64,${employee.photoBase64}`;
    }
    if (employee.photoUrl) {
      return employee.photoUrl;
    }
    return null;
  };

  const handleImageError = (id: string) => {
    setBrokenImages((prev) => new Set(prev).add(id));
  };

  const handleDownload = async (employee: EmployeeResult) => {
    const fileName = `${employee.name.replace(/\s+/g, "_")}.jpg`;

    try {
      if (employee.photoBase64) {
        const byteCharacters = atob(employee.photoBase64);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      if (employee.photoUrl) {
        try {
          const response = await fetch(employee.photoUrl);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {
          window.open(employee.photoUrl, "_blank");
        }
      }
    } catch {
      if (employee.photoUrl) {
        window.open(employee.photoUrl, "_blank");
      }
    }
  };

  return (
    <div className="min-h-screen badge-pattern relative">
      {/* Decorative header bar */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <header className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary tracking-tight">
            Busca de Fotos
          </h1>
          <p className="text-text-muted mt-2 text-sm">
            Pesquise fotos de colaboradores pela intranet Digitro
          </p>
        </header>

        {/* Search Card */}
        <div
          className="bg-surface rounded-2xl shadow-xl shadow-primary/10 border border-border overflow-hidden animate-slide-up mb-8"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="bg-gradient-to-r from-primary to-primary-light px-6 py-4">
            <h2 className="text-white font-medium flex items-center gap-2">
              <svg
                className="w-5 h-5 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Pesquisar Colaborador
            </h2>
          </div>

          <form onSubmit={handleSearch} className="p-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Digite o nome do colaborador..."
                className="flex-1 px-4 py-3 bg-input-bg border border-input-border rounded-lg focus-ring transition-all duration-200 placeholder:text-text-subtle text-foreground"
              />
              <button
                type="submit"
                disabled={status === "loading" || !searchName.trim()}
                className={`
                  px-6 py-3 rounded-lg font-medium text-white transition-all duration-200
                  flex items-center gap-2 shrink-0
                  ${
                    status === "loading"
                      ? "animate-shimmer cursor-not-allowed"
                      : "bg-primary hover:bg-primary-light active:scale-[0.98] shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  }
                `}
              >
                {status === "loading" ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Buscando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Buscar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results Area */}
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {/* Loading Skeleton */}
          {status === "loading" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface rounded-2xl border border-border overflow-hidden"
                >
                  <div className="aspect-square bg-border-light animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-border-light rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-border-light rounded animate-pulse w-1/2" />
                    <div className="h-4 bg-border-light rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="p-4 bg-error-bg border border-error/30 rounded-lg flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-error-text"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-sm text-error-text font-medium">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Empty State */}
          {status === "empty" && (
            <div className="text-center py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-border-light mb-4">
                <svg
                  className="w-8 h-8 text-text-subtle"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="text-text-muted font-medium">
                Nenhum resultado encontrado
              </p>
              <p className="text-text-subtle text-sm mt-1">
                Nenhum colaborador encontrado para &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <>
              <p className="text-sm text-text-muted mb-4">
                <span className="font-medium text-foreground">{total}</span>{" "}
                resultado{total !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((employee, index) => {
                  const photoSrc = getPhotoSrc(employee);
                  const employeeKey = employee.id || `employee-${index}`;
                  const isBroken = brokenImages.has(employeeKey);

                  return (
                    <div
                      key={employeeKey}
                      className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
                    >
                      {/* Photo */}
                      <div className="aspect-square bg-border-light relative overflow-hidden">
                        {photoSrc && !isBroken ? (
                          <img
                            src={photoSrc}
                            alt={employee.name}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(employeeKey)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-background">
                            <svg
                              className="w-20 h-20 text-border"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-3">
                        <h3 className="font-bold text-primary text-sm leading-tight">
                          {employee.name}
                        </h3>

                        {/* Area badges */}
                        {employee.areas && employee.areas.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {employee.areas.map((a, i) => (
                              <span
                                key={i}
                                className="inline-block text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent-light font-medium"
                              >
                                {a.subArea || a.area}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Email */}
                        {employee.email && (
                          <p className="text-xs text-text-muted flex items-center gap-1.5">
                            <svg
                              className="w-3.5 h-3.5 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="truncate">{employee.email}</span>
                          </p>
                        )}

                        {/* Extension */}
                        {employee.extension && (
                          <p className="text-xs text-text-muted flex items-center gap-1.5">
                            <svg
                              className="w-3.5 h-3.5 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            Ramal {employee.extension}
                          </p>
                        )}

                        {/* Download Button */}
                        {(photoSrc && !isBroken) && (
                          <button
                            onClick={() => handleDownload(employee)}
                            className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                            Baixar Foto
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer
          className="mt-8 text-center animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <p className="text-xs text-text-muted">
            Sistema UNA &middot; Guarda Municipal de Florianópolis
          </p>
        </footer>
      </div>
    </div>
  );
}
