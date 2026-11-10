import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  User,
  Shield,
  Trash2,
  Edit3,
  X,
  Upload,
  Camera,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  ArrowRight,
  Filter,
  RefreshCw,
  LogOut,
  Copy,
  Eye,
  Check,
  Tag,
  Laptop,
  FileText,
  Briefcase,
  Shirt,
  BookOpen,
  Package,
  Share2,
  Award,
  HelpCircle,
  Home,
  Compass,
  CreditCard
} from 'lucide-react';

// --- API Helpers ---
const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('kuda_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export default function App() {
  // --- Global Application State ---
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, claimed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('kuda_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All'); // All, Lost, Found, Reunited
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [myItemsOnly, setMyItemsOnly] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null); // { url, title }

  // Form states
  const [activeItem, setActiveItem] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // login | register
  const [authForm, setAuthForm] = useState({ name: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);

  // Notice banner state
  const [showNotice, setShowNotice] = useState(true);

  // Mobile Bottom Tab active state
  const [mobileTab, setMobileTab] = useState('home');

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- Initial Data Loading ---
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/items`),
        fetch(`${API_BASE}/items/stats`)
      ]);
      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();

      if (itemsData.success) {
        setItems(itemsData.data || []);
      }
      if (statsData.success) {
        setStats(statsData.data || { total: 0, lost: 0, found: 0, claimed: 0 });
      }
    } catch (err) {
      addToast('Failed to sync campus feed: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Verify stored session
    const token = localStorage.getItem('kuda_auth_token');
    if (token) {
      fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('kuda_user', JSON.stringify(data.user));
          } else {
            handleLogout(false);
          }
        })
        .catch(() => {});
    }
  }, []);

  // --- Authentication Handlers ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = authMode === 'login'
        ? { username: authForm.username.trim(), password: authForm.password }
        : { name: authForm.name.trim(), username: authForm.username.trim(), password: authForm.password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || (data.errors ? data.errors.join(', ') : 'Authentication failed'));
      }

      localStorage.setItem('kuda_auth_token', data.token);
      localStorage.setItem('kuda_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsAuthOpen(false);
      setAuthForm({ name: '', username: '', password: '' });
      addToast(`Welcome back, ${data.user.name}!`, 'success');
      loadData(true);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = (showNotification = true) => {
    localStorage.removeItem('kuda_auth_token');
    localStorage.removeItem('kuda_user');
    setCurrentUser(null);
    setMyItemsOnly(false);
    if (showNotification) addToast('Signed out of campus session', 'info');
  };

  const handleQuickLogin = (username, password) => {
    setAuthForm({ name: '', username, password });
    setAuthMode('login');
  };

  // --- CRUD Operations ---
  const handleCreatePost = async (formData, imageFile) => {
    if (!currentUser) {
      addToast('Please sign in to post items', 'error');
      setIsAuthOpen(true);
      return;
    }
    setPostSubmitting(true);
    try {
      let finalImageUrl = formData.image_url || '';

      // Upload image file if provided
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const upRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: uploadData
        });
        const upJson = await upRes.json();
        if (upJson.success && upJson.url) {
          finalImageUrl = upJson.url;
        }
      }

      const postPayload = {
        ...formData,
        image_url: finalImageUrl
      };

      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(postPayload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || (data.errors ? data.errors.join(', ') : 'Failed to publish post'));
      }

      addToast(`${formData.post_type} item reported successfully!`, 'success');
      setIsCreateOpen(false);
      loadData(true);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleUpdatePost = async (id, updatedFields, newImageFile) => {
    setPostSubmitting(true);
    try {
      let finalImageUrl = updatedFields.image_url;

      if (newImageFile) {
        const uploadData = new FormData();
        uploadData.append('image', newImageFile);
        const upRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: uploadData
        });
        const upJson = await upRes.json();
        if (upJson.success && upJson.url) {
          finalImageUrl = upJson.url;
        }
      }

      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ ...updatedFields, image_url: finalImageUrl })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update post');
      }

      addToast('Item updated successfully', 'success');
      setIsEditOpen(false);
      setActiveItem(null);
      loadData(true);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!activeItem) return;
    setPostSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/items/${activeItem._id || activeItem.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete record');
      }

      addToast('Item removed from campus board', 'success');
      setIsDeleteOpen(false);
      setActiveItem(null);
      loadData(true);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (item, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/items/${item._id || item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Status update failed');
      addToast(`Status updated to "${newStatus}"`, 'success');
      loadData(true);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // --- Filtered Feed Memo ---
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Type Tab filter
      if (selectedType === 'Lost' && item.post_type !== 'Lost') return false;
      if (selectedType === 'Found' && item.post_type !== 'Found') return false;
      if (selectedType === 'Reunited' && item.status === 'Open') return false;

      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

      // Status filter
      if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;

      // My Items filter
      if (myItemsOnly) {
        if (!currentUser) return false;
        const isOwner = currentUser.role === 'admin' ||
          (item.creator_id && item.creator_id === currentUser.id) ||
          (item.creator_username && item.creator_username.toLowerCase() === currentUser.username.toLowerCase());
        if (!isOwner) return false;
      }

      // Keyword Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = (item.title || '').toLowerCase().includes(q);
        const inDesc = (item.description || '').toLowerCase().includes(q);
        const inLoc = (item.location || '').toLowerCase().includes(q);
        const inCategory = (item.category || '').toLowerCase().includes(q);
        return inTitle || inDesc || inLoc || inCategory;
      }

      return true;
    });
  }, [items, selectedType, selectedCategory, selectedStatus, myItemsOnly, searchQuery, currentUser]);

  const reunionRate = stats.total > 0 ? Math.round(((stats.claimed || 0) / stats.total) * 100) : 85;

  return (
    <div className="min-h-screen bg-kuda-bg text-white pb-28 md:pb-12">
      {/* ---------------------------------------------------- */}
      {/* 1. Kuda Top Navigation Header */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-40 glass-nav border-b border-kuda-border px-4 py-3 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & User Avatar */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => {
                if (currentUser) {
                  setMyItemsOnly(prev => !prev);
                  addToast(myItemsOnly ? 'Showing all campus items' : 'Showing your reports only', 'info');
                } else {
                  setIsAuthOpen(true);
                }
              }}
              className="relative cursor-pointer group"
              title={currentUser ? `Signed in as @${currentUser.username}` : 'Click to Sign In'}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-kuda-purpleDark to-kuda-purple p-0.5 shadow-kuda-glow flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-kuda-surface flex items-center justify-center font-bold text-sm text-kuda-purpleLight group-hover:scale-105 transition-transform">
                  {currentUser ? (
                    currentUser.name.slice(0, 2).toUpperCase()
                  ) : (
                    <User className="w-4 h-4 text-kuda-muted" />
                  )}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-kuda-mint border-2 border-kuda-bg rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  <span className="text-kuda-purpleLight">Kuda</span>
                  <span>Campus</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-kuda-purple/20 text-kuda-purpleLight border border-kuda-purple/30">
                  Lost & Found
                </span>
              </div>
              <p className="text-[11px] text-kuda-muted hidden sm:block">
                University Belongings Recovery Hub
              </p>
            </div>
          </div>

          {/* Desktop Search Bar (Kuda pill input) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-kuda-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lost items, phones, wallets, student IDs..."
                className="w-full bg-kuda-surface border border-kuda-border rounded-full pl-10 pr-10 py-2 text-sm text-white placeholder-kuda-muted focus:outline-none focus:border-kuda-purple focus:ring-1 focus:ring-kuda-purple transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-kuda-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Kuda Points Badge */}
            <div className="hidden lg:flex items-center gap-1.5 bg-kuda-surface border border-kuda-border px-3 py-1.5 rounded-full text-xs font-semibold text-kuda-amber">
              <Award className="w-3.5 h-3.5" />
              <span>Campus Karma: 120</span>
            </div>

            {/* Refresh Live Feed */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 rounded-full bg-kuda-surface border border-kuda-border text-kuda-muted hover:text-white hover:border-kuda-purple transition-colors"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-kuda-purpleLight' : ''}`} />
            </button>

            {/* Auth Button or Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveItem({ post_type: 'Lost', category: 'Electronics', status: 'Open' });
                    setIsCreateOpen(true);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 bg-kuda-purple hover:bg-kuda-purpleDark text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-kuda-glow transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Report Item</span>
                </button>
                <button
                  onClick={() => handleLogout(true)}
                  className="p-2 rounded-full bg-kuda-surface border border-kuda-border text-kuda-muted hover:text-kuda-coral hover:border-kuda-coral/40 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-kuda-purple hover:bg-kuda-purpleDark text-white px-4 py-2 rounded-full text-xs font-bold shadow-kuda-glow transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="mt-3 md:hidden">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-kuda-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lost items, phones, keys, IDs..."
              className="w-full bg-kuda-surface border border-kuda-border rounded-full pl-10 pr-10 py-2 text-sm text-white placeholder-kuda-muted focus:outline-none focus:border-kuda-purple transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-kuda-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* 2. Main Content Container */}
      {/* ---------------------------------------------------- */}
      <main className="max-w-6xl mx-auto px-4 py-5 md:px-8 space-y-6">

        {/* ---------------------------------------------------- */}
        {/* Kuda Hero Balance / Campus Metric Card */}
        {/* ---------------------------------------------------- */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-kuda-card via-kuda-surface to-kuda-bg border border-kuda-border p-5 md:p-7 shadow-kuda-card">
          {/* Ambient Purple Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-kuda-purple/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-kuda-muted mb-1.5">
                <span className="inline-flex items-center gap-1 font-semibold text-kuda-purpleLight">
                  <CreditCard className="w-3.5 h-3.5" />
                  Campus Registry ID
                </span>
                <span>•</span>
                <span className="font-mono text-white/90">#CLBG-2026-CAMPUS</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://student-lost-and-found.onrender.com');
                    addToast('Platform URL copied to clipboard!', 'info');
                  }}
                  className="text-kuda-muted hover:text-white"
                  title="Copy Link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Large Hero Metric Typography */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-sans">
                  {stats.total}
                </span>
                <span className="text-base sm:text-xl font-bold text-kuda-muted">
                  Total Active Reports
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-kuda-coralBg text-kuda-coral font-bold border border-kuda-coral/20">
                  <span className="w-2 h-2 rounded-full bg-kuda-coral animate-ping"></span>
                  {stats.lost} Lost Items
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-kuda-mintBg text-kuda-mint font-bold border border-kuda-mint/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {stats.found} Found Items
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-kuda-purple/20 text-kuda-purpleLight font-bold border border-kuda-purple/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  {reunionRate}% Reunited Rate
                </span>
              </div>
            </div>

            {/* Quick Primary Actions inside Hero */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (!currentUser) {
                    addToast('Please sign in to report items', 'error');
                    setIsAuthOpen(true);
                    return;
                  }
                  setActiveItem({ post_type: 'Lost', category: 'Electronics', status: 'Open' });
                  setIsCreateOpen(true);
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>I Lost Something</span>
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    addToast('Please sign in to report items', 'error');
                    setIsAuthOpen(true);
                    return;
                  }
                  setActiveItem({ post_type: 'Found', category: 'Electronics', status: 'Open' });
                  setIsCreateOpen(true);
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>I Found Something</span>
              </button>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* Kuda Quick Access 4-Card Grid */}
        {/* ---------------------------------------------------- */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-white tracking-wide">
              Quick Actions
            </h2>
            <button
              onClick={() => {
                setSelectedType('All');
                setSelectedCategory('All');
                setSelectedStatus('All');
                setMyItemsOnly(false);
                setSearchQuery('');
                addToast('All filters reset', 'info');
              }}
              className="text-xs font-semibold text-kuda-purpleLight hover:underline"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
            {/* Action 1: Filter Lost */}
            <button
              onClick={() => {
                setSelectedType('Lost');
                setMyItemsOnly(false);
              }}
              className={`p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${
                selectedType === 'Lost' && !myItemsOnly
                  ? 'bg-kuda-cardHover border-kuda-coral shadow-kuda-glow'
                  : 'bg-kuda-card border-kuda-border hover:bg-kuda-cardHover'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-kuda-coralBg flex items-center justify-center text-kuda-coral">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-white text-center">
                Lost Feed
              </span>
            </button>

            {/* Action 2: Filter Found */}
            <button
              onClick={() => {
                setSelectedType('Found');
                setMyItemsOnly(false);
              }}
              className={`p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${
                selectedType === 'Found' && !myItemsOnly
                  ? 'bg-kuda-cardHover border-kuda-mint shadow-kuda-glow'
                  : 'bg-kuda-card border-kuda-border hover:bg-kuda-cardHover'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-kuda-mintBg flex items-center justify-center text-kuda-mint">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-white text-center">
                Found Feed
              </span>
            </button>

            {/* Action 3: My Posts */}
            <button
              onClick={() => {
                if (!currentUser) {
                  addToast('Please sign in to view your posts', 'info');
                  setIsAuthOpen(true);
                  return;
                }
                setMyItemsOnly(prev => !prev);
              }}
              className={`p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${
                myItemsOnly
                  ? 'bg-kuda-cardHover border-kuda-purple shadow-kuda-glow'
                  : 'bg-kuda-card border-kuda-border hover:bg-kuda-cardHover'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-kuda-purple/20 flex items-center justify-center text-kuda-purpleLight">
                <User className="w-5 h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-white text-center">
                {myItemsOnly ? 'All Items' : 'My Posts'}
              </span>
            </button>

            {/* Action 4: Reunited */}
            <button
              onClick={() => {
                setSelectedType('Reunited');
                setMyItemsOnly(false);
              }}
              className={`p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${
                selectedType === 'Reunited' && !myItemsOnly
                  ? 'bg-kuda-cardHover border-kuda-amber shadow-kuda-glow'
                  : 'bg-kuda-card border-kuda-border hover:bg-kuda-cardHover'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-kuda-amberBg flex items-center justify-center text-kuda-amber">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-white text-center">
                Reunited
              </span>
            </button>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* Kuda Lilac Notice Banner */}
        {/* ---------------------------------------------------- */}
        {showNotice && (
          <section className="rounded-2xl bg-kuda-lilac text-kuda-lilacText p-4 relative flex items-start gap-3 shadow-md">
            <div className="w-8 h-8 rounded-full bg-kuda-purpleDark text-white flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 pr-6">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5">
                Campus Security Alert
              </h4>
              <p className="text-xs leading-relaxed opacity-90">
                Found Student IDs and Electronics must be handed over to Campus Security Desk (Science Library 1st Floor) or posted here with contact info for rapid verification.
              </p>
            </div>
            <button
              onClick={() => setShowNotice(false)}
              className="absolute top-3 right-3 text-kuda-lilacText/70 hover:text-kuda-lilacText p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </section>
        )}

        {/* ---------------------------------------------------- */}
        {/* Category Pills & Sub-tabs */}
        {/* ---------------------------------------------------- */}
        <section className="space-y-3">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['All', 'Electronics', 'Documents', 'Accessories', 'Clothing', 'Books', 'Other'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-white text-kuda-bg shadow-sm'
                    : 'bg-kuda-card border border-kuda-border text-kuda-muted hover:text-white hover:border-kuda-purple/40'
                }`}
              >
                {cat === 'All' && '✨ All Categories'}
                {cat === 'Electronics' && '💻 Electronics'}
                {cat === 'Documents' && '🪪 Documents'}
                {cat === 'Accessories' && '🎒 Accessories'}
                {cat === 'Clothing' && '👕 Clothing'}
                {cat === 'Books' && '📚 Books'}
                {cat === 'Other' && '📦 Other'}
              </button>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* Item Feed Grid */}
        {/* ---------------------------------------------------- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                {myItemsOnly ? 'My Published Posts' : 'Campus Board Feed'}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-kuda-card border border-kuda-border text-kuda-muted font-bold">
                {filteredItems.length}
              </span>
            </div>

            {/* Quick Status Filter Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-kuda-card border border-kuda-border rounded-xl px-2.5 py-1 text-xs text-kuda-muted focus:outline-none focus:border-kuda-purple cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Status: Open</option>
              <option value="Claimed">Status: Claimed</option>
              <option value="Returned">Status: Returned</option>
            </select>
          </div>

          {/* Loading Skeleton */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="rounded-2xl bg-kuda-card border border-kuda-border p-4 space-y-3">
                  <div className="h-44 rounded-xl skeleton-shimmer"></div>
                  <div className="h-5 w-3/4 rounded skeleton-shimmer"></div>
                  <div className="h-4 w-1/2 rounded skeleton-shimmer"></div>
                  <div className="h-10 rounded skeleton-shimmer"></div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl bg-kuda-card border border-kuda-border p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-kuda-surface mx-auto flex items-center justify-center text-kuda-purpleLight shadow-kuda-glow">
                <Search className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">No items found</h4>
                <p className="text-xs text-kuda-muted mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No reports matching "${searchQuery}". Try different keywords or reset filters.`
                    : 'No reports in this category yet. Be the first student to publish a post!'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('All');
                  setSelectedCategory('All');
                  setSelectedStatus('All');
                  setMyItemsOnly(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-kuda-surface border border-kuda-border text-xs font-bold text-kuda-purpleLight hover:border-kuda-purple"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            /* Items Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const id = item._id || item.id;
                const isOwner = currentUser && (
                  currentUser.role === 'admin' ||
                  (item.creator_id && item.creator_id === currentUser.id) ||
                  (item.creator_username && item.creator_username.toLowerCase() === currentUser.username.toLowerCase())
                );
                const isLost = item.post_type === 'Lost';

                return (
                  <div
                    key={id}
                    className="group rounded-2xl bg-kuda-card border border-kuda-border hover:border-kuda-purple/50 transition-all flex flex-col justify-between overflow-hidden shadow-kuda-card hover:shadow-kuda-glow"
                  >
                    <div>
                      {/* Image Thumbnail / Category Fallback */}
                      <div className="relative w-full h-44 bg-kuda-surface overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            onClick={() => setLightboxImage({ url: item.image_url, title: item.title })}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            onClick={() => {
                              if (isOwner) {
                                setActiveItem(item);
                                setIsEditOpen(true);
                              }
                            }}
                            className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-kuda-card via-kuda-surface to-kuda-purpleDark/30 text-kuda-muted p-4 cursor-pointer"
                          >
                            <ImageIcon className="w-8 h-8 text-kuda-muted/60 mb-1" />
                            <span className="text-[11px] font-medium text-kuda-muted">
                              {isOwner ? 'Click to add item photo' : 'No photo uploaded'}
                            </span>
                          </div>
                        )}

                        {/* Top Overlaid Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-md ${
                              isLost
                                ? 'bg-kuda-coral text-white'
                                : 'bg-kuda-mint text-kuda-bg'
                            }`}
                          >
                            {item.post_type}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-md ${
                              item.status === 'Open'
                                ? 'bg-black/60 text-white border border-white/10'
                                : item.status === 'Claimed'
                                ? 'bg-kuda-amber text-kuda-bg'
                                : 'bg-kuda-mint text-kuda-bg'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        {/* Photo Zoom Pill Indicator */}
                        {item.image_url && (
                          <button
                            onClick={() => setLightboxImage({ url: item.image_url, title: item.title })}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white/80 hover:text-white"
                            title="View Full Photo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-2.5">
                        {/* Reporter & Category Meta */}
                        <div className="flex items-center justify-between text-xs text-kuda-muted">
                          <span className="flex items-center gap-1 text-[11px] font-medium">
                            <User className="w-3 h-3 text-kuda-purpleLight" />
                            {item.creator_name || 'Campus Student'}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-kuda-surface border border-kuda-border">
                            {item.category}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-kuda-purpleLight transition-colors">
                          {item.title}
                        </h4>

                        {/* Location & Time */}
                        <div className="flex items-center gap-2 text-xs text-kuda-muted">
                          <span className="flex items-center gap-1 text-kuda-coral shrink-0">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[140px] text-white/90">{item.location}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-kuda-muted leading-relaxed line-clamp-2">
                          {item.description}
                        </p>

                        {/* Contact Box */}
                        <div className="rounded-xl bg-kuda-surface border border-kuda-border p-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block text-[10px] text-kuda-muted font-bold uppercase tracking-wider">
                              Contact
                            </span>
                            <span className="text-xs font-mono font-medium text-white truncate block">
                              {item.contact_info}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.contact_info);
                              addToast(`Copied contact info: ${item.contact_info}`, 'info');
                            }}
                            className="p-1.5 rounded-lg bg-kuda-card hover:bg-kuda-purple hover:text-white text-kuda-muted transition-colors shrink-0"
                            title="Copy Contact Info"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer / Ownership Actions */}
                    <div className="p-3 bg-kuda-surface/60 border-t border-kuda-border flex items-center justify-between gap-2">
                      {isOwner ? (
                        <>
                          {/* Quick Status Selector */}
                          <select
                            value={item.status}
                            onChange={(e) => handleQuickStatusChange(item, e.target.value)}
                            className="bg-kuda-card border border-kuda-border text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-kuda-purple cursor-pointer flex-1"
                          >
                            <option value="Open">Status: Open</option>
                            <option value="Claimed">Status: Claimed</option>
                            <option value="Returned">Status: Returned</option>
                          </select>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setActiveItem(item);
                                setIsEditOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-kuda-muted hover:text-white hover:bg-kuda-card transition-colors"
                              title="Edit Post"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setActiveItem(item);
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-kuda-coral hover:bg-kuda-coralBg transition-colors"
                              title="Delete Post"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-between text-xs text-kuda-muted py-0.5">
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Shield className="w-3 h-3 text-kuda-purpleLight" />
                            <span>Protected Record</span>
                          </span>
                          <button
                            onClick={() => {
                              window.location.href = `mailto:${item.contact_info}?subject=${encodeURIComponent(`[Campus Lost & Found] Inquiring about ${item.title}`)}`;
                            }}
                            className="text-xs font-bold text-kuda-purpleLight hover:underline flex items-center gap-1"
                          >
                            <span>Reach Out</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ---------------------------------------------------- */}
      {/* 3. Kuda Mobile Bottom Navigation Bar */}
      {/* ---------------------------------------------------- */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-nav border-t border-kuda-border px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => {
            setMobileTab('home');
            setSelectedType('All');
            setMyItemsOnly(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            mobileTab === 'home' && selectedType === 'All' && !myItemsOnly ? 'text-kuda-purpleLight' : 'text-kuda-muted'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button
          onClick={() => {
            setMobileTab('lost');
            setSelectedType('Lost');
            setMyItemsOnly(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            selectedType === 'Lost' ? 'text-kuda-coral' : 'text-kuda-muted'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-bold">Lost</span>
        </button>

        {/* Central Prominent Post + Button */}
        <button
          onClick={() => {
            if (!currentUser) {
              addToast('Please sign in to publish a post', 'info');
              setIsAuthOpen(true);
              return;
            }
            setActiveItem({ post_type: 'Lost', category: 'Electronics', status: 'Open' });
            setIsCreateOpen(true);
          }}
          className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-kuda-purpleDark to-kuda-purple flex items-center justify-center text-white shadow-kuda-glow active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => {
            setMobileTab('found');
            setSelectedType('Found');
            setMyItemsOnly(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            selectedType === 'Found' ? 'text-kuda-mint' : 'text-kuda-muted'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-bold">Found</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) {
              setIsAuthOpen(true);
            } else {
              setMyItemsOnly(prev => !prev);
              addToast(myItemsOnly ? 'Showing all posts' : 'Showing your posts', 'info');
            }
          }}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            myItemsOnly ? 'text-kuda-purpleLight' : 'text-kuda-muted'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">{currentUser ? 'My Posts' : 'Sign In'}</span>
        </button>
      </nav>

      {/* ---------------------------------------------------- */}
      {/* 4. MODALS */}
      {/* ---------------------------------------------------- */}

      {/* CREATE ITEM MODAL (with Image Upload) */}
      {isCreateOpen && (
        <ItemFormModal
          mode="create"
          initialData={activeItem || { post_type: 'Lost', category: 'Electronics', status: 'Open' }}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreatePost}
          submitting={postSubmitting}
        />
      )}

      {/* EDIT ITEM MODAL */}
      {isEditOpen && activeItem && (
        <ItemFormModal
          mode="edit"
          initialData={activeItem}
          onClose={() => {
            setIsEditOpen(false);
            setActiveItem(null);
          }}
          onSubmit={(fields, file) => handleUpdatePost(activeItem._id || activeItem.id, fields, file)}
          submitting={postSubmitting}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm modal-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-kuda-card border border-kuda-border p-6 text-center space-y-4 shadow-kuda-elevated">
            <div className="w-12 h-12 rounded-full bg-kuda-coralBg text-kuda-coral mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Report?</h3>
              <p className="text-xs text-kuda-muted mt-1 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-white">"{activeItem.title}"</strong>? This action cannot be reversed.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setIsDeleteOpen(false);
                  setActiveItem(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-kuda-surface border border-kuda-border text-xs font-bold text-kuda-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                disabled={postSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-kuda-coral hover:bg-rose-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {postSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTH MODAL (Login & Register) */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm modal-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-kuda-card border border-kuda-border p-6 md:p-8 space-y-5 shadow-kuda-elevated relative">
            <button
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-5 right-5 text-kuda-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-kuda-purpleDark to-kuda-purple mx-auto flex items-center justify-center shadow-kuda-glow text-white font-black text-xl">
                K
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {authMode === 'login' ? 'Sign In to Kuda Campus' : 'Create Student Account'}
              </h3>
              <p className="text-xs text-kuda-muted">
                {authMode === 'login'
                  ? 'Access your student dashboard and manage your reports'
                  : 'Join university students recovering misplaced items'}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex rounded-xl bg-kuda-surface p-1 border border-kuda-border">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authMode === 'login'
                    ? 'bg-kuda-purple text-white shadow-sm'
                    : 'text-kuda-muted hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authMode === 'register'
                    ? 'bg-kuda-purple text-white shadow-sm'
                    : 'text-kuda-muted hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
                    Full Student Name
                  </label>
                  <input
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    placeholder="e.g. Babatunde Fashola"
                    className="w-full bg-kuda-surface border border-kuda-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-kuda-purple transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  placeholder="e.g. tunde"
                  className="w-full bg-kuda-surface border border-kuda-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-kuda-purple transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-kuda-surface border border-kuda-border rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-kuda-purple transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-kuda-muted hover:text-white"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 rounded-xl bg-kuda-purple hover:bg-kuda-purpleDark text-white text-xs font-bold shadow-kuda-glow transition-all active:scale-95 disabled:opacity-50"
              >
                {authSubmitting
                  ? 'Authenticating...'
                  : authMode === 'login'
                  ? 'Sign In to Campus'
                  : 'Create Student Account'}
              </button>
            </form>

            {/* Quick Demo Logins for Evaluator */}
            <div className="pt-2 border-t border-kuda-border">
              <span className="block text-[10px] text-center font-bold text-kuda-muted uppercase tracking-wider mb-2">
                Quick Evaluator Accounts (1-Click)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('tunde', 'password123')}
                  className="px-2 py-1.5 rounded-lg bg-kuda-surface border border-kuda-border hover:border-kuda-purple text-[11px] font-semibold text-white/90 text-center"
                >
                  @tunde
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('chioma', 'password123')}
                  className="px-2 py-1.5 rounded-lg bg-kuda-surface border border-kuda-border hover:border-kuda-purple text-[11px] font-semibold text-white/90 text-center"
                >
                  @chioma
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin', 'admin123')}
                  className="px-2 py-1.5 rounded-lg bg-kuda-surface border border-kuda-border hover:border-kuda-purple text-[11px] font-semibold text-kuda-purpleLight text-center"
                >
                  @admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN IMAGE LIGHTBOX */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md modal-fade-in cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full rounded-3xl overflow-hidden bg-kuda-card border border-kuda-border shadow-kuda-elevated"
          >
            <div className="p-3.5 bg-kuda-surface flex items-center justify-between border-b border-kuda-border">
              <span className="text-xs font-bold text-white truncate max-w-sm">
                {lightboxImage.title}
              </span>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg text-kuda-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden flex items-center justify-center bg-black">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. FLOATING TOAST NOTIFICATIONS */}
      {/* ---------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-kuda-elevated flex items-center gap-2.5 text-xs font-bold toast-slide-in border ${
              toast.type === 'success'
                ? 'bg-kuda-card text-kuda-mint border-kuda-mint/30 shadow-kuda-glow'
                : toast.type === 'error'
                ? 'bg-kuda-card text-kuda-coral border-kuda-coral/30'
                : 'bg-kuda-card text-kuda-purpleLight border-kuda-purple/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// ITEM FORM MODAL (Reusable for Create & Edit with Image Upload)
// ----------------------------------------------------
function ItemFormModal({ mode, initialData, onClose, onSubmit, submitting }) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    post_type: initialData.post_type || 'Lost',
    category: initialData.category || 'Electronics',
    location: initialData.location || '',
    contact_info: initialData.contact_info || '',
    status: initialData.status || 'Open',
    image_url: initialData.image_url || ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialData.image_url || '');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WebP)');
      return;
    }
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, imageFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm modal-fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-kuda-card border border-kuda-border p-5 sm:p-7 space-y-4 shadow-kuda-elevated my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-kuda-muted hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            {mode === 'create' ? 'Publish Campus Report' : 'Edit Item Report'}
          </h3>
          <p className="text-xs text-kuda-muted">
            {mode === 'create'
              ? 'Fill in the details and add a photo so the rightful student can identify it.'
              : 'Update item status, location, or photo.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Post Type Selector (Kuda Segmented) */}
          <div>
            <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, post_type: 'Lost' })}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  formData.post_type === 'Lost'
                    ? 'bg-kuda-coralBg text-kuda-coral border-kuda-coral shadow-sm'
                    : 'bg-kuda-surface text-kuda-muted border-kuda-border'
                }`}
              >
                Lost Item (Searching)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, post_type: 'Found' })}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  formData.post_type === 'Found'
                    ? 'bg-kuda-mintBg text-kuda-mint border-kuda-mint shadow-sm'
                    : 'bg-kuda-surface text-kuda-muted border-kuda-border'
                }`}
              >
                Found Item (Recovered)
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
              Item Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Matte Black Hydro Flask Water Bottle"
              className="w-full bg-kuda-surface border border-kuda-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-kuda-purple transition-all"
            />
          </div>

          {/* Category & Status Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-kuda-surface border border-kuda-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-kuda-purple cursor-pointer"
              >
                <option value="Electronics">Electronics</option>
                <option value="Documents">Documents & IDs</option>
                <option value="Accessories">Accessories</option>
                <option value="Clothing">Clothing</option>
                <option value="Books">Books & Coursework</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-kuda-surface border border-kuda-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-kuda-purple cursor-pointer"
              >
                <option value="Open">Open (Active)</option>
                <option value="Claimed">Claimed</option>
                <option value="Returned">Returned / Resolved</option>
              </select>
            </div>
          </div>

          {/* Location & Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
                Location on Campus *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Lecture Hall B, Row 3"
                className="w-full bg-kuda-surface border border-kuda-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-kuda-purple transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
                Your Contact Info *
              </label>
              <input
                type="text"
                required
                value={formData.contact_info}
                onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                placeholder="e.g. tunde@campus.edu or 08012345678"
                className="w-full bg-kuda-surface border border-kuda-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-kuda-purple transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
              Description & Identifying Marks *
            </label>
            <textarea
              required
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe color, scratches, stickers, contents, or circumstances..."
              className="w-full bg-kuda-surface border border-kuda-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-kuda-purple transition-all"
            />
          </div>

          {/* ---------------------------------------------------- */}
          {/* IMAGE UPLOAD ZONE (Drag & Drop + Preview) */}
          {/* ---------------------------------------------------- */}
          <div>
            <label className="block text-[11px] font-bold text-kuda-muted uppercase mb-1">
              Item Photo (Optional but Recommended)
            </label>

            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-kuda-border bg-kuda-surface group">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="w-full h-36 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-kuda-purple text-white text-xs font-bold"
                  >
                    Change Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreviewUrl('');
                      setFormData({ ...formData, image_url: '' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-kuda-coral text-white text-xs font-bold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-kuda-purple bg-kuda-purple/10'
                    : 'border-kuda-border hover:border-kuda-purple/50 bg-kuda-surface/50'
                }`}
              >
                <Upload className="w-6 h-6 text-kuda-purpleLight mx-auto mb-1" />
                <span className="block text-xs font-bold text-white">
                  Click or drag photo here
                </span>
                <span className="block text-[10px] text-kuda-muted mt-0.5">
                  PNG, JPG, WebP up to 5MB
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-kuda-surface border border-kuda-border text-xs font-bold text-kuda-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-kuda-purple hover:bg-kuda-purpleDark text-white text-xs font-bold shadow-kuda-glow transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Saving Report...' : mode === 'create' ? 'Publish Report' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
