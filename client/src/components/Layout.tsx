import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  Briefcase, 
  Heart, 
  MessageSquare, 
  User, 
  BarChart3, 
  LogOut,
  Search,
  Bell,
  Grid3X3
} from 'lucide-react';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { path: '/swipe', label: 'Jobs', icon: Briefcase },
    { path: '/matches', label: 'Matches', icon: Heart },
    { path: '/messages', label: 'Messages', icon: MessageSquare },
    { path: '/analytics', label: 'Insights', icon: BarChart3 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#F3F2EF]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/swipe" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#0A66C2]">SwipeHire</span>
            </Link>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8C8C]" />
                <input
                  type="text"
                  placeholder="Search jobs, companies..."
                  className="w-full pl-10 pr-4 py-2 bg-[#F3F2EF] border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2]"
                />
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <item.icon className="w-6 h-6" />
                  <span className="text-xs mt-0.5">{item.label}</span>
                </Link>
              ))}

              {/* Notifications */}
              <button className="nav-link relative">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-xs mt-0.5">Notifications</span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative group">
                <button className="nav-link">
                  <div className="w-6 h-6 rounded-full bg-[#0A66C2] flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <span className="text-xs mt-0.5">Me</span>
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-[#E0E0E0] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-3 border-b border-[#E0E0E0]">
                    <p className="font-semibold text-[#191919]">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-[#8C8C8C]">{user?.email}</p>
                  </div>
                  <Link to="/profile" className="block px-3 py-2 text-sm text-[#666666] hover:bg-[#F3F2EF]">
                    View Profile
                  </Link>
                  <Link to="/subscription" className="block px-3 py-2 text-sm text-[#666666] hover:bg-[#F3F2EF]">
                    Subscription
                  </Link>
                  <Link to="/api-tester" className="block px-3 py-2 text-sm text-[#666666] hover:bg-[#F3F2EF]">
                    API Tester
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Work Grid */}
              <button className="nav-link border-l border-[#E0E0E0] ml-2 pl-4">
                <Grid3X3 className="w-6 h-6" />
                <span className="text-xs mt-0.5">Work</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
export default Layout;