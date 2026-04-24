'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { NAV_ITEMS } from '@/lib/constants';
import { usePathname } from 'next/navigation';
import SearchCommand from './SearchCommand';

const MobileNav = ({ initialStocks }: { initialStocks: StockWithWatchlistStatus[] }) => {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    };

    return (
        <div className="sm:hidden">
            <button
                onClick={() => setOpen(true)}
                className="p-2 text-gray-400 hover:text-teal-500 transition-colors"
                aria-label="Open navigation menu"
            >
                <Menu className="h-6 w-6" />
            </button>

            <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
                <DialogPrimitive.Portal>
                    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                    <DialogPrimitive.Content
                        aria-describedby={undefined}
                        className="fixed inset-y-0 left-0 z-50 w-72 bg-gray-800 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300"
                    >
                        <DialogPrimitive.Title className="sr-only">Navigation Menu</DialogPrimitive.Title>
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-gray-100 font-semibold text-base">Menu</span>
                            <DialogPrimitive.Close className="text-gray-400 hover:text-teal-500 transition-colors p-1 rounded">
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close menu</span>
                            </DialogPrimitive.Close>
                        </div>

                        <nav>
                            <ul className="flex flex-col gap-5 font-medium">
                                {NAV_ITEMS.map(({ href, label }) => {
                                    if (href === '/search') return (
                                        <li key="search-trigger" onClick={() => setOpen(false)}>
                                            <SearchCommand
                                                renderAs="text"
                                                label="Search"
                                                initialStocks={initialStocks}
                                            />
                                        </li>
                                    );
                                    return (
                                        <li key={href}>
                                            <Link
                                                href={href}
                                                onClick={() => setOpen(false)}
                                                className={`text-base hover:text-teal-500 transition-colors ${isActive(href) ? 'text-gray-100' : 'text-gray-400'}`}
                                            >
                                                {label}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
        </div>
    );
};

export default MobileNav;
