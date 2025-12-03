import React from "react";
import { Link } from "react-router-dom";

export const NotFoundPage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-blue-600">404</h1>
                <h2 className="mt-4 text-3xl font-bold text-slate-900">Halaman Tidak Ditemukan</h2>
                <p className="mt-2 text-lg text-slate-600">Maaf, halaman yang Anda cari tidak tersedia.</p>
                <div className="mt-8">
                    <Link to="/" className="btn-primary inline-block">
                        Kembali ke Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};
