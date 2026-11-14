import { Archivo, Azeret_Mono } from 'next/font/google';

// Archivo carries everything: its width axis gives a condensed display voice and a normal text voice.
export const display = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-display', display: 'swap' });
// Azeret Mono is used only for measured values: coordinates, dates, wavelengths.
export const mono = Azeret_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });
