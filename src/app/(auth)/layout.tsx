export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 lg:p-8 overflow-hidden">

      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/dental-clinic.jpg')",
          filter: "blur(18px) saturate(1.15) brightness(1.05)",
          // scale evita bordes blancos del blur
          transform: "scale(1.1)",
        }}
      />
      <div className="absolute inset-0 bg-white/55" />

      <div
        className="relative z-10 w-full max-w-5xl rounded-[2rem] overflow-hidden flex shadow-2xl shadow-slate-900/25"
        style={{ minHeight: "680px" }}
      >
        <div className="w-full lg:w-[44%] bg-white flex flex-col justify-center px-10 py-12">
          {children}
        </div>

        <div className="hidden lg:block flex-1 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/dental-clinic.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />

          <div className="absolute top-6 right-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4.5 h-4.5 text-cyan-600"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 2C9 2 6.5 4 6.5 6.5c0 1.5.5 2.8 1 4L9 16h6l1.5-5.5c.5-1.2 1-2.5 1-4C17.5 4 15 2 12 2z"
                />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm drop-shadow-md">MaraDental</span>
          </div>

          <div className="absolute bottom-5 left-4 right-4">
            <div className="rounded-xl border border-white/20 bg-black/30 px-4 py-2.5">
              <p className="text-center text-[10px] text-white/65 leading-relaxed">
                © {new Date().getFullYear()} MaraDental. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
