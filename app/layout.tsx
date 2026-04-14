import type {Metadata} from 'next';
import './globals.css';
import { Cinzel, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

// We use Google Fonts as elegant fallbacks.
// The actual local fonts 'Felix Titling' and 'Trajan Sans' are prioritized in globals.css
const cinzel = Cinzel({subsets:['latin'], variable:'--font-cinzel'});
const playfair = Playfair_Display({subsets:['latin'], variable:'--font-playfair'});

export const metadata: Metadata = {
  title: 'Sala Vínica - Dunas Wines',
  description: 'Premium digital wine menu experience.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn(playfair.variable, cinzel.variable)}>
      <body className="font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
