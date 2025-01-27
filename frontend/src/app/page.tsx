'use client'

import * as React from 'react';
import Footer from './components/Footer';
import Header from './components/Header';
import TiptapEditor from './components/TipTapEditor';
import Grid from '@mui/material/Grid2'
import NavBar from './components/NavBar';

export default function Home() {
  return (
    <div className="bg-[#001122]">
        <Header />
        <div>
          <NavBar />
          <div className="flex h-screen">
            <div className="w-[200px] bg-[#0B345F]">
              <p className="text-white p-4">Fixed Width (200px)</p>
            </div>

            <div className="flex-1 bg-[#1B446F] p-4">
              <div className="p-1 border border-black bg-transparent">
                <TiptapEditor />
              </div>
            </div>
          </div>
        </div>
        <Footer />
    </div>
  );
}
