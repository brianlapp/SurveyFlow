import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Menu, X } from "lucide-react";
import { FaFacebookF } from "react-icons/fa";

interface NavItem {
  label: string;
  url: string;
}

interface TyPageData {
  brand: {
    name: string;
    logoUrl: string | null;
    thankYouTitle: string;
    fontFamily: string;
    navItems: NavItem[];
    primaryColor: string;
    newsletterReminder: string | null;
    footerCopyright: string | null;
    termsUrl: string | null;
    privacyUrl: string | null;
  };
  page: {
    offerTitle: string;
    offerImageUrl: string | null;
    buttonText: string;
    fbShareUrl: string | null;
    clickUrl: string;
    impressionPixel: string;
  };
}

export default function TyPublic() {
  const { brandSlug, pageSlug } = useParams<{ brandSlug: string; pageSlug: string }>();
  const [data, setData] = useState<TyPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/public/ty/${brandSlug}/${pageSlug}`);
        if (!res.ok) {
          throw new Error("Page not found");
        }
        const pageData = await res.json();
        setData(pageData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [brandSlug, pageSlug]);

  useEffect(() => {
    if (data?.page.impressionPixel) {
      const img = new Image();
      img.src = data.page.impressionPixel + `&cachebuster=${Date.now()}`;
    }
  }, [data]);

  const handleClick = async () => {
    try {
      await fetch(`/api/public/ty/${brandSlug}/${pageSlug}/click`, { method: 'POST' });
    } catch (e) {
    }
    window.location.href = data!.page.clickUrl;
  };

  const handleFbShare = () => {
    if (!data?.page.fbShareUrl) return;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.page.fbShareUrl)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-gray-500">This offer page is no longer available.</p>
        </div>
      </div>
    );
  }

  const { brand, page } = data;
  const navItems = (brand.navItems || []) as NavItem[];

  return (
    <div 
      className="min-h-screen bg-white"
      style={{ fontFamily: `'${brand.fontFamily}', system-ui, sans-serif` }}
    >
      <link 
        href={`https://fonts.googleapis.com/css2?family=${brand.fontFamily.replace(' ', '+')}&display=swap`} 
        rel="stylesheet" 
      />
      
      <header className="sticky top-0 bg-white border-b shadow-sm z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-8 md:h-10" />
          ) : (
            <span className="font-bold text-lg">{brand.name}</span>
          )}
          
          <nav className="hidden md:flex items-center gap-4">
            {navItems.map((item, i) => (
              <a 
                key={i} 
                href={item.url}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          
          <button 
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {menuOpen && (
          <div className="md:hidden border-t">
            <nav className="flex flex-col">
              {navItems.map((item, i) => (
                <a 
                  key={i} 
                  href={item.url}
                  className="px-4 py-3 text-gray-600 hover:bg-gray-50 border-b last:border-b-0"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <h1 
          className="text-2xl md:text-3xl font-bold text-center mb-6"
          style={{ color: brand.primaryColor }}
        >
          {brand.thankYouTitle}
        </h1>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
          <div className="p-4 md:p-6">
            <p 
              className="text-center font-bold text-lg mb-4"
              style={{ color: brand.primaryColor }}
            >
              {page.offerTitle}
            </p>

            {page.offerImageUrl && (
              <img 
                src={page.offerImageUrl} 
                alt="Offer" 
                className="w-full rounded-lg mb-6"
              />
            )}

            <button 
              onClick={handleClick}
              className="w-full py-4 rounded-full text-white font-bold text-xl transition-transform active:scale-95 hover:opacity-90"
              style={{ backgroundColor: brand.primaryColor }}
            >
              {page.buttonText}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">*sponsored*</p>
          </div>
        </div>

        {page.fbShareUrl && (
          <div className="mt-6 text-center">
            <button 
              onClick={handleFbShare}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] text-white rounded hover:bg-[#166FE5] transition-colors font-medium"
            >
              <FaFacebookF className="h-4 w-4" />
              Share
            </button>
          </div>
        )}

        {brand.newsletterReminder && (
          <div className="mt-8 pt-6 border-t">
            <p className="text-center text-gray-600 italic text-sm md:text-base font-medium">
              {brand.newsletterReminder}
            </p>
          </div>
        )}

        <footer className="mt-8 pt-6 border-t text-center">
          {brand.footerCopyright && (
            <p className="text-gray-500 text-sm mb-3">{brand.footerCopyright}</p>
          )}
          
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {brand.termsUrl && (
              <a 
                href={brand.termsUrl}
                className="text-blue-600 hover:underline"
              >
                Terms of Service
              </a>
            )}
            {brand.privacyUrl && (
              <a 
                href={brand.privacyUrl}
                className="text-blue-600 hover:underline"
              >
                Privacy Policy
              </a>
            )}
          </div>
          
          {!brand.termsUrl && !brand.privacyUrl && navItems.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              {navItems.map((item, i) => (
                <a 
                  key={i} 
                  href={item.url}
                  className="hover:text-gray-700"
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </footer>
      </main>
    </div>
  );
}
