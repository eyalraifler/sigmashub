import "./globals.css";
import { geistSans, geistMono } from "./fonts";
import CustomCursor from "./components/CustomCursor";

export const metadata = {
  title: "SigmaHub",
  description: "social network",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          "antialiased",
          "min-h-screen",
          "bg-black",
          "text-white",
        ].join(" ")}
      >
        
        {children}
      </body>
    </html>
  );
}

