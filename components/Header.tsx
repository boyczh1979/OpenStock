import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";
import MobileNav from "@/components/MobileNav";
import {searchStocks} from "@/lib/actions/finnhub.actions";

const Header = async ({ user }: { user: User }) => {
    const initialStocks = await searchStocks();

    return (
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
                <Link href="/" className="flex items-center justify-center gap-2">
                    <Image
                        src="https://i.ibb.co/r28VWPjS/Screenshot-2025-10-04-123317-Picsart-Ai-Image-Enhancer-removebg-preview.png"
                        alt="OpenStock"
                        width={200}
                        height={50}
                    />
                </Link>
                <nav className="hidden sm:block">
                    <NavItems initialStocks={initialStocks}/>
                </nav>

                <div className="flex items-center gap-1">
                    <MobileNav initialStocks={initialStocks} />
                    <UserDropdown user={user} />
                </div>
            </div>
        </header>
    )
}
export default Header