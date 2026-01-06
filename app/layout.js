import "./globals.css";

export const metadata = {
  title: "AI Image Generator | Amazon PDP & General Images",
  description: "Generate stunning Amazon product listing images and AI-powered visuals. Upload your product, get 6 professional images instantly.",
  keywords: "AI image generator, Amazon PDP, product images, e-commerce, listing photos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
