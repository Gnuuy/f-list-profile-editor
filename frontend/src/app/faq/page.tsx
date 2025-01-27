'use client'

import * as React from 'react';
import Footer from '../components/Footer';
import Header from '../components/Header';

import NavBar from '../components/NavBar';

export default function FAQ()
{
    return (
    <div className="bg-[#001122] shadow-custom-black rounded-sm">
        <Header />
        <div>
          <NavBar />
          <div className="flex h-screen">
                <div className="w-[210px] bg-[#0B345F]">
                    <p className="text-white p-4">Fixed Width (200px)</p>
                </div>

                <div className="flex-1 bg-[#1B446F]">
                    <h2>SOFTEST SANI</h2>
                </div>
            </div>
        </div>
        <Footer />
        </div>
    )
}