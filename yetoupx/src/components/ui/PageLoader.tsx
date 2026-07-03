interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export default function PageLoader({ message = "Chargement du catalogue…", fullScreen = false }: PageLoaderProps) {
  return (
    <div
      className={`page-loader${fullScreen ? " page-loader--fullscreen" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="page-loader-spinner" />
      <p className="page-loader-text">{message}</p>
    </div>
  );
}
