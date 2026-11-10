import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  MapPin,
  User,
  Trash2,
  Edit3,
  X,
  Upload,
  Image as ImageIcon,
  Copy,
  Eye,
  RefreshCw,
  LogOut,
  ArrowRight,
  Check,
  Lock,
  ShieldCheck,
  Activity,
  Layers,
  Laptop,
  FileText,
  Watch,
  Shirt,
  BookOpen,
  Package,
  ChevronDown,
  Sparkles,
  FileCheck,
  Send,
  Home,
  Compass,
  Bell,
  Clock,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  Key,
  Wallet,
  Briefcase
} from 'lucide-react';

const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('nile_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Category Definitions with Lucide SVG Icons (Zero emojis)
const CATEGORIES = [
  { value: 'All', label: 'All Categories', icon: Layers },
  { value: 'Electronics', label: 'Electronics', icon: Laptop },
  { value: 'Documents', label: 'Documents & IDs', icon: FileText },
  { value: 'Accessories', label: 'Accessories & Watches', icon: Watch },
  { value: 'Clothing', label: 'Clothing & Apparel', icon: Shirt },
  { value: 'Books', label: 'Books & Notes', icon: BookOpen },
  { value: 'Wallets', label: 'Wallets & Purses', icon: Wallet },
  { value: 'Keys', label: 'Keys & Keycards', icon: Key },
  { value: 'Bags', label: 'Bags & Backpacks', icon: Briefcase },
  { value: 'Other', label: 'Other Property', icon: Package }
];

const STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses', icon: Clock },
  { value: 'Open', label: 'Status: Open', icon: Clock },
  { value: 'Claimed', label: 'Status: Claimed', icon: CheckCircle2 },
  { value: 'Returned', label: 'Status: Returned', icon: Sparkles }
];

const AUDIT_ACTIONS = [
  { value: 'All', label: 'All Actions' },
  { value: 'AUTH_LOGIN', label: 'Sign In Events' },
  { value: 'ITEM_CREATED', label: 'Posts Created' },
  { value: 'STATUS_CHANGED', label: 'Status Updates' },
  { value: 'CLAIM_SUBMITTED', label: 'Claims Filed' },
  { value: 'CLAIM_APPROVED', label: 'Claims Approved' },
  { value: 'ACCESS_DENIED', label: 'Security Blocks' }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('nile_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, claimed: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Active Navigation Tab: 'home' | 'browse' | 'matches' | 'claims' | 'audit'
  const [activeTab, setActiveTab] = useState('home');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All'); // All, Lost, Found
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedAuditAction, setSelectedAuditAction] = useState('All');
  const [myItemsOnly, setMyItemsOnly] = useState(false);

  // Modals & Bottom Sheets
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPostChooserOpen, setIsPostChooserOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Active item & Form states
  const [activeItem, setActiveItem] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // login | register
  const [authForm, setAuthForm] = useState({ name: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Claim Form State
  const [claimVerificationAnswer, setClaimVerificationAnswer] = useState('');
  const [claimContact, setClaimContact] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const headers = getAuthHeaders();
      const [itemsRes, statsRes, auditRes, claimsRes] = await Promise.all([
        fetch(`${API_BASE}/items`, { headers }),
        fetch(`${API_BASE}/items/stats`, { headers }),
        fetch(`${API_BASE}/audit-logs`, { headers }),
        fetch(`${API_BASE}/claims/my`, { headers }).catch(() => ({ json: () => ({ success: false }) }))
      ]);

      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();
      const auditData = await auditRes.json();
      const claimsData = await claimsRes.json();

      if (itemsData.success) setItems(itemsData.data || []);
      if (statsData.success) setStats(statsData.data || { total: 0, lost: 0, found: 0, claimed: 0 });
      if (auditData.success) setAuditLogs(auditData.data || []);
      if (claimsData.success) setClaims(claimsData.data || []);
    } catch (err) {
      addToast('Could not load campus data: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('nile_auth_token');
    if (token) {
      fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('nile_user', JSON.stringify(data.user));
            loadData();
          } else {
            handleLogout(false);
          }
        })
        .catch(() => loadData());
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // Auth Submit
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
        throw new Error(data.message || (data.errors ? data.errors.join(', ') : 'Sign in failed'));
      }

      localStorage.setItem('nile_auth_token', data.token);
      localStorage.setItem('nile_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setAuthForm({ name: '', username: '', password: '' });
      addToast(`Welcome back, ${data.user.name}!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = (showNotification = true) => {
    localStorage.removeItem('nile_auth_token');
    localStorage.removeItem('nile_user');
    setCurrentUser(null);
    setMyItemsOnly(false);
    setActiveTab('home');
    if (showNotification) addToast('Signed out of student session', 'info');
  };

  const handleQuickLogin = (username, password) => {
    setAuthForm({ name: '', username, password });
    setAuthMode('login');
  };

  // Create Post
  const handleCreatePost = async (formData, imageFile) => {
    setPostSubmitting(true);
    try {
      let finalImageUrl = formData.image_url || '';

      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: uploadData
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.url) {
          finalImageUrl = uploadJson.url;
        }
      }

      const postBody = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        post_type: formData.post_type,
        category: formData.category,
        location: formData.location.trim(),
        contact_info: formData.contact_info.trim() || `${currentUser.username}@nileuniversity.edu.ng`,
        status: formData.status || 'Open',
        image_url: finalImageUrl
      };

      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(postBody)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || (data.errors ? data.errors.join(', ') : 'Failed to publish post'));
      }

      setIsCreateOpen(false);
      setActiveItem(null);
      await loadData(true);
      addToast(`Your ${postBody.post_type} report has been published!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  // Update Post
  const handleUpdatePost = async (id, formData, imageFile) => {
    setPostSubmitting(true);
    try {
      let finalImageUrl = formData.image_url || '';

      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: uploadData
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.url) {
          finalImageUrl = uploadJson.url;
        }
      }

      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          ...formData,
          image_url: finalImageUrl
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update post');
      }

      setIsEditOpen(false);
      setActiveItem(null);
      await loadData(true);
      addToast('Post updated successfully', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  // Quick Status Change
  const handleQuickStatusChange = async (item, newStatus) => {
    const id = item._id || item.id;
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not update status');
      }
      await loadData(true);
      addToast(`Status updated to ${newStatus}`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Delete Post
  const handleDeletePost = async () => {
    if (!activeItem) return;
    setPostSubmitting(true);
    const id = activeItem._id || activeItem.id;
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete post');
      }

      setIsDeleteOpen(false);
      setActiveItem(null);
      await loadData(true);
      addToast('Post removed permanently', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  // Submit Claim (Privacy Protection)
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!activeItem) return;
    setClaimSubmitting(true);
    try {
      const itemId = activeItem._id || activeItem.id;
      const res = await fetch(`${API_BASE}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          item_id: itemId,
          verification_answer: claimVerificationAnswer.trim(),
          claimant_contact: claimContact.trim() || `${currentUser.username}@nileuniversity.edu.ng`
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit claim');
      }

      setIsClaimModalOpen(false);
      setClaimVerificationAnswer('');
      setClaimContact('');
      setActiveItem(null);
      await loadData(true);
      addToast('Claim request sent! The finder will review your verification answer.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('Contact copied', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedType === 'Lost' && item.post_type !== 'Lost') return false;
      if (selectedType === 'Found' && item.post_type !== 'Found') return false;

      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;

      if (myItemsOnly) {
        if (!currentUser) return false;
        const isOwner = currentUser.role === 'admin' ||
          (item.creator_id && item.creator_id === currentUser.id) ||
          (item.creator_username && item.creator_username.toLowerCase() === currentUser.username.toLowerCase());
        if (!isOwner) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = (item.title || '').toLowerCase().includes(q);
        const inDesc = (item.description || '').toLowerCase().includes(q);
        const inLoc = (item.location || '').toLowerCase().includes(q);
        return inTitle || inDesc || inLoc;
      }

      return true;
    });
  }, [items, selectedType, selectedCategory, selectedStatus, myItemsOnly, searchQuery, currentUser]);

  // Smart Matches Pairs Computation
  const smartMatches = useMemo(() => {
    const lostItems = items.filter(i => i.post_type === 'Lost');
    const foundItems = items.filter(i => i.post_type === 'Found');
    const matchesList = [];

    for (const lost of lostItems) {
      for (const found of foundItems) {
        let score = 0;
        if (lost.category && found.category && lost.category.toLowerCase() === found.category.toLowerCase()) {
          score += 40;
        }

        const lTokens = (lost.title + ' ' + lost.description).toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const fTokens = new Set((found.title + ' ' + found.description).toLowerCase().split(/\s+/).filter(w => w.length > 2));
        let matches = 0;
        for (const token of lTokens) {
          if (fTokens.has(token)) matches++;
        }
        if (lTokens.length > 0) {
          score += Math.min(40, matches * 12);
        }

        if (lost.location && found.location && (lost.location.toLowerCase().includes(found.location.toLowerCase()) || found.location.toLowerCase().includes(lost.location.toLowerCase()))) {
          score += 20;
        }

        if (score >= 40) {
          matchesList.push({
            id: `${lost._id || lost.id}-${found._id || found.id}`,
            lost,
            found,
            score: Math.min(100, score)
          });
        }
      }
    }
    return matchesList.sort((a, b) => b.score - a.score);
  }, [items]);

  // -------------------------------------------------------------------------
  // 1. FORCED LOGIN VIEW (100% Gated Nile University Portal)
  // -------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-nile-dots flex flex-col justify-between text-[#1F2328] relative font-sans">
        {/* Top Gold Accent Strip */}
        <div className="h-1.5 w-full bg-[#EAB308]"></div>

        <div className="p-4 sm:p-6 flex flex-col flex-1 justify-between max-w-md mx-auto w-full">
          {/* Nile Header Brand */}
          <div className="flex items-center justify-between pt-2 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#1E4FA3] flex items-center justify-center text-white font-black text-sm tracking-wide shadow-sm">
                NU
              </div>
              <div>
                <span className="font-heading font-extrabold text-sm text-[#1E4FA3] tracking-tight block leading-tight">
                  NILE UNIVERSITY OF NIGERIA
                </span>
                <span className="text-[9px] font-bold text-[#3FA34D] tracking-widest uppercase block leading-tight">
                  HONORIS UNITED UNIVERSITIES
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#EEF2F9] rounded-full px-2.5 py-1 text-[10px] font-bold text-[#1E4FA3]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3FA34D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3FA34D]"></span>
              </span>
              <span>VERIFIED PORTAL</span>
            </div>
          </div>

          {/* Centered Login Card with 0.95 Scale Ease-out Motion Blur */}
          <div className="my-auto animate-motion-blur-dialog">
            <div className="bg-white rounded-2xl border border-[#E5E9F2] p-6 sm:p-8 shadow-nile-card space-y-6">
              <div className="text-center space-y-2">
                <span className="text-[10px] font-bold text-[#3FA34D] uppercase tracking-widest block">
                  STUDENT VERIFICATION PORTAL
                </span>
                <div className="w-14 h-14 rounded-2xl bg-[#1E4FA3] text-white flex items-center justify-center mx-auto shadow-md">
                  <ShieldCheck className="w-7 h-7 text-[#3FA34D]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#1E4FA3] tracking-tight">
                  {authMode === 'login' ? 'Sign In to Campus Registry' : 'New Student Registration'}
                </h2>
                <p className="text-xs text-[#6B7280] leading-relaxed max-w-xs mx-auto">
                  {authMode === 'login'
                    ? 'Official Nile University student portal. Sign in to post, match, and claim campus belongings.'
                    : 'Register your verified student credentials to access the campus property board.'}
                </p>
              </div>

              {/* Segmented Auth Mode Switcher */}
              <div className="flex bg-[#EEF2F9] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all btn-spring ${
                    authMode === 'login'
                      ? 'bg-white text-[#1E4FA3] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#1F2328]'
                  }`}
                >
                  Student Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all btn-spring ${
                    authMode === 'register'
                      ? 'bg-white text-[#1E4FA3] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#1F2328]'
                  }`}
                >
                  New Registration
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#1F2328] uppercase tracking-wider mb-1">
                      Full Student Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={authForm.name}
                        onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                        placeholder="e.g. Tunde Adebayo"
                        className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-[#1F2328] uppercase tracking-wider mb-1">
                    Student Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={authForm.username}
                      onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                      placeholder="e.g. tunde"
                      className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F2328] uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl pl-9 pr-10 py-2.5 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3] focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2328] btn-spring"
                    >
                      {showPassword ? (
                        <span className="animate-crossfade inline-flex"><Eye className="w-4 h-4 text-[#1E4FA3]" /></span>
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary CTA: "Proceed →" */}
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-bold transition-all shadow-md btn-spring disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{authSubmitting ? 'Verifying Student Session...' : authMode === 'login' ? 'Proceed to Campus Board' : 'Complete Registration'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Evaluator Access (1-Click Fill) */}
              <div className="pt-4 border-t border-slate-100 text-center space-y-2">
                <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">
                  Quick Evaluator Demo Accounts (1-Click Fill)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('tunde', 'password123')}
                    className="py-1.5 px-2 rounded-lg bg-[#EEF2F9] border border-[#E5E9F2] hover:border-[#1E4FA3] text-[11px] font-semibold text-[#1E4FA3] transition-colors btn-spring"
                  >
                    @tunde
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('chioma', 'password123')}
                    className="py-1.5 px-2 rounded-lg bg-[#EEF2F9] border border-[#E5E9F2] hover:border-[#1E4FA3] text-[11px] font-semibold text-[#1E4FA3] transition-colors btn-spring"
                  >
                    @chioma
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    className="py-1.5 px-2 rounded-lg bg-[#1E4FA3] text-white text-[11px] font-semibold transition-colors btn-spring"
                  >
                    @admin
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pb-2 text-[11px] text-[#6B7280]">
            Nile University of Nigeria • Honoris United Universities
          </div>
        </div>

        {/* Toasts */}
        <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold toast-slide-in border ${
                toast.type === 'success'
                  ? 'bg-white text-[#3FA34D] border-[#3FA34D]/30'
                  : toast.type === 'error'
                  ? 'bg-white text-[#F25C54] border-[#F25C54]/30'
                  : 'bg-white text-[#1E4FA3] border-[#1E4FA3]/30'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#3FA34D]" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[#F25C54]" />}
              {toast.type === 'info' && <Check className="w-4 h-4 shrink-0 text-[#1E4FA3]" />}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. AUTHENTICATED MOBILE-FIRST UI (Marcelo Design X Spacing & Nile Theme)
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-white text-[#1F2328] pb-24 font-sans relative selection:bg-[#EEF2F9] selection:text-[#1E4FA3]">
      {/* Top Gold Accent Strip */}
      <div className="h-1.5 w-full bg-[#EAB308]"></div>

      {/* ---------------------------------------------------- */}
      {/* 2.1 Sticky Top App Bar (56px) */}
      {/* ---------------------------------------------------- */}
      <header className="bg-white border-b border-[#E5E9F2] sticky top-0 z-40 shadow-xs h-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-8 h-8 rounded-lg bg-[#1E4FA3] flex items-center justify-center text-white font-black text-xs tracking-wider shrink-0 shadow-xs">
              NU
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-heading font-extrabold text-xs sm:text-sm text-[#1E4FA3] tracking-tight">
                  NILE
                </span>
                <span className="font-heading font-extrabold text-xs sm:text-sm text-[#1F2328] tracking-tight">
                  LOST & FOUND
                </span>
              </div>
              <span className="text-[9px] font-bold text-[#3FA34D] uppercase tracking-wider block leading-none">
                CAMPUS REGISTRY
              </span>
            </div>
          </div>

          {/* Right Header: Notification & Nile Wallet-style Session Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('matches')}
              className="relative p-2 rounded-full hover:bg-[#EEF2F9] text-[#6B7280] hover:text-[#1E4FA3] transition-colors btn-spring"
              title="Notifications & Matches"
            >
              <Bell className="w-4 h-4" />
              {smartMatches.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F25C54]"></span>
              )}
            </button>

            {/* Nile Wallet Style Pill (from Portal Screenshot) */}
            <div className="hidden sm:flex items-center gap-2 bg-[#EEF2F9] rounded-full px-3 py-1 border border-[#E5E9F2]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3FA34D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3FA34D]"></span>
              </span>
              <span className="text-[11px] font-bold text-[#1E4FA3] tabular-nums">
                @{currentUser.username}
              </span>
              <span className="text-[9px] uppercase font-bold text-[#6B7280] bg-white px-1.5 py-0.5 rounded-full">
                {currentUser.role}
              </span>
            </div>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 rounded-full hover:bg-[#EEF2F9] text-[#6B7280] hover:text-[#1E4FA3] transition-colors btn-spring"
              title="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#1E4FA3]' : ''}`} />
            </button>

            <button
              onClick={() => handleLogout(true)}
              className="p-2 rounded-full hover:bg-rose-50 text-[#6B7280] hover:text-[#F25C54] transition-colors btn-spring"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* 2.2 Main View Switcher based on Active Tab */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'home' && (
        <div>
          {/* MARCELO DESIGN X DARK HERO GRADIENT */}
          <section className="hero-nile-gradient text-white pt-8 pb-14 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* Greeting & Main Headline Stat */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white/80 block">
                    Welcome back, {currentUser.name?.split(' ')[0]}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white mt-1">
                    {stats.claimed + 128} Items Reunited
                  </h1>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-widest text-white/70 block">
                    ACTIVE REPORTS
                  </span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                    {stats.total}
                  </span>
                </div>
              </div>

              {/* Large Rounded Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#6B7280] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search: Casio calculator, student ID, keys, laptop..."
                  className="w-full bg-white text-[#1F2328] placeholder-[#6B7280] rounded-2xl pl-11 pr-10 py-3.5 text-xs font-medium focus:outline-none shadow-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2328]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Segmented Filter Pills (All | Lost | Found) */}
              <div className="flex items-center gap-2">
                {['All', 'Lost', 'Found'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all btn-spring ${
                      selectedType === type
                        ? 'bg-white text-[#1E4FA3] shadow-sm'
                        : 'bg-white/15 text-white/90 border border-white/20 hover:bg-white/25'
                    }`}
                  >
                    {type === 'All' ? 'All Items' : type}
                  </button>
                ))}

                <button
                  onClick={() => setMyItemsOnly(prev => !prev)}
                  className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold transition-all btn-spring ${
                    myItemsOnly
                      ? 'bg-[#3FA34D] text-white shadow-sm'
                      : 'bg-white/15 text-white/90 border border-white/20'
                  }`}
                >
                  {myItemsOnly ? 'My Posts Only' : 'My Posts'}
                </button>
              </div>

              {/* Four Round Labeled Quick Actions */}
              <div className="grid grid-cols-4 gap-3 pt-2 text-center">
                <button
                  onClick={() => {
                    setActiveItem({ post_type: 'Lost', category: 'Electronics', status: 'Open' });
                    setIsCreateOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 group btn-spring"
                >
                  <div className="w-13 h-13 rounded-2xl bg-[#F25C54] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Search className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                    REPORT LOST
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveItem({ post_type: 'Found', category: 'Electronics', status: 'Open' });
                    setIsCreateOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 group btn-spring"
                >
                  <div className="w-13 h-13 rounded-2xl bg-[#3FA34D] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                    REPORT FOUND
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('matches')}
                  className="flex flex-col items-center gap-1.5 group btn-spring"
                >
                  <div className="w-13 h-13 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Compass className="w-5 h-5 text-[#EAB308]" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                    SMART MATCH
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className="flex flex-col items-center gap-1.5 group btn-spring"
                >
                  <div className="w-13 h-13 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Activity className="w-5 h-5 text-emerald-300" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                    AUDIT LOG
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* WHITE SHEET OVERLAPPING THE HERO (Marcelo Design X Spec) */}
          <section className="-mt-6 bg-white sheet-overlap-top border-t border-[#E5E9F2] px-4 sm:px-6 pt-6 max-w-5xl mx-auto shadow-2xl">
            {/* Quick Category Chips with Lucide Icons (Zero emojis) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
              {CATEGORIES.map(cat => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all btn-spring ${
                      isSelected
                        ? 'bg-[#1E4FA3] text-white shadow-sm'
                        : 'bg-[#EEF2F9] text-[#1F2328] hover:bg-slate-200/80 border border-[#E5E9F2]'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Smart Match Banner (if matches exist) */}
            {smartMatches.length > 0 && (
              <div
                onClick={() => setActiveTab('matches')}
                className="mb-6 p-4 rounded-2xl bg-[#EEF2F9] border border-[#1E4FA3]/20 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#E5EDFB] transition-colors btn-spring"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E4FA3] text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-[#EAB308]" />
                  </div>
                  <div>
                    <span className="font-heading font-extrabold text-xs text-[#1E4FA3] block">
                      Smart Match Radar Found {smartMatches.length} Possible Matches!
                    </span>
                    <span className="text-[11px] text-[#6B7280]">
                      Review AI-suggested matches between lost and found items.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#1E4FA3] shrink-0">
                  <span>Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* Feed Header with Custom Status Dropdown */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-extrabold text-lg text-[#1F2328] tracking-tight">
                  Recently Posted Items
                </h3>
                <span className="text-xs text-[#6B7280]">
                  Showing <strong className="text-[#1F2328] tabular-nums">{filteredItems.length}</strong> campus items
                </span>
              </div>

              {/* Custom Status Dropdown (No native <select>!) */}
              <div className="w-40">
                <CustomSelect
                  value={selectedStatus}
                  onChange={(val) => setSelectedStatus(val)}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>

            {/* Item Cards Feed */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {[1, 2, 3].map(n => (
                  <div key={n} className="bg-white rounded-2xl border border-[#E5E9F2] p-4 space-y-3 shadow-xs">
                    <div className="h-44 rounded-xl skeleton-shimmer"></div>
                    <div className="h-4 w-3/4 rounded-md skeleton-shimmer"></div>
                    <div className="h-3 w-1/2 rounded-md skeleton-shimmer"></div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E9F2] p-12 text-center space-y-3 my-6 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#EEF2F9] text-[#1E4FA3] flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <p className="text-sm font-heading font-bold text-[#1F2328]">No matching property found</p>
                <p className="text-xs text-[#6B7280]">Try adjusting your search keywords or resetting filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('All');
                    setSelectedCategory('All');
                    setSelectedStatus('All');
                    setMyItemsOnly(false);
                  }}
                  className="text-xs font-bold text-[#1E4FA3] hover:underline btn-spring"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filteredItems.map((item, idx) => {
                  const id = item._id || item.id;
                  const isOwner = currentUser && (
                    currentUser.role === 'admin' ||
                    (item.creator_id && item.creator_id === currentUser.id) ||
                    (item.creator_username && item.creator_username.toLowerCase() === currentUser.username.toLowerCase())
                  );
                  const isLost = item.post_type === 'Lost';
                  const catObj = CATEGORIES.find(c => c.value === item.category) || CATEGORIES[1];
                  const CatIcon = catObj.icon;

                  return (
                    <div
                      key={id}
                      style={{ animationDelay: `${Math.min(idx * 30, 240)}ms` }}
                      className="stagger-item bg-white rounded-2xl border border-[#E5E9F2] hover:border-[#CBD5E1] card-hover-spring flex flex-col justify-between overflow-hidden shadow-nile-card"
                    >
                      <div>
                        {/* 4:3 Photo Area */}
                        <div className="relative w-full h-44 bg-[#F8FAFC] overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              onClick={() => setLightboxImage({ url: item.image_url, title: item.title })}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
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
                              className="w-full h-full flex flex-col items-center justify-center text-[#6B7280] p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              <CatIcon className="w-8 h-8 text-[#CBD5E1] mb-1" />
                              <span className="text-[11px] text-[#6B7280]">
                                {isOwner ? 'Add real photo' : 'No photo uploaded'}
                              </span>
                            </div>
                          )}

                          {/* Top-Left Pill Badge: Lost (Coral) / Found (Campus Green) */}
                          <div className="absolute top-2.5 left-2.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-wide text-white shadow-xs ${
                                isLost ? 'bg-[#F25C54]' : 'bg-[#3FA34D]'
                              }`}
                            >
                              {item.post_type}
                            </span>
                          </div>

                          {/* Top-Right Status Chip */}
                          <div className="absolute top-2.5 right-2.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#1F2328] border border-[#E5E9F2] shadow-xs">
                              {item.status}
                            </span>
                          </div>
                        </div>

                        {/* Card Body with 3-Level Text Hierarchy */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-[#6B7280] font-medium">
                            <div className="flex items-center gap-1 text-[#1E4FA3] font-semibold">
                              <CatIcon className="w-3.5 h-3.5" />
                              <span>{item.category}</span>
                            </div>
                            <span className="tabular-nums font-mono text-[11px]">
                              {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <h4 className="font-heading font-bold text-sm text-[#1F2328] leading-snug line-clamp-1">
                            {item.title}
                          </h4>

                          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                            <MapPin className="w-3.5 h-3.5 text-[#F25C54] shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>

                          <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Contact or Claim Button */}
                          <div className="pt-2">
                            {isOwner ? (
                              <div className="bg-[#EEF2F9] border border-[#E5E9F2] rounded-xl p-2 flex items-center justify-between text-xs text-[#1E4FA3] font-medium">
                                <span className="truncate">Your post ({item.status})</span>
                                <button
                                  onClick={() => handleCopy(id, item.contact_info)}
                                  className="text-[#6B7280] hover:text-[#1F2328] p-1 btn-spring"
                                  title="Copy contact"
                                >
                                  {copiedId === id ? (
                                    <span className="animate-crossfade inline-flex"><Check className="w-3.5 h-3.5 text-[#3FA34D]" /></span>
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveItem(item);
                                  setIsClaimModalOpen(true);
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-heading font-bold flex items-center justify-center gap-1.5 btn-spring shadow-xs"
                              >
                                <span>{isLost ? 'I Found This →' : 'This Is Mine (Claim) →'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Owner Controls with Custom Dropdown */}
                      {isOwner && (
                        <div className="p-3 bg-[#F8FAFC] border-t border-[#E5E9F2] flex items-center justify-between gap-2">
                          {/* Custom Status Dropdown for Post Owner */}
                          <div className="flex-1">
                            <CustomSelect
                              value={item.status}
                              onChange={(val) => handleQuickStatusChange(item, val)}
                              options={[
                                { value: 'Open', label: 'Open', icon: Clock },
                                { value: 'Claimed', label: 'Claimed', icon: CheckCircle2 },
                                { value: 'Returned', label: 'Returned', icon: Sparkles }
                              ]}
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setActiveItem(item);
                                setIsEditOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-[#6B7280] transition-colors btn-spring"
                              title="Edit post"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setActiveItem(item);
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-[#F25C54] transition-colors btn-spring"
                              title="Delete post"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.3 SMART MATCH RADAR TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'matches' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-motion-blur">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#3FA34D] uppercase tracking-widest block">
                INTELLIGENT REUNION ENGINE
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#1E4FA3] tracking-tight">
                Smart Match Radar
              </h2>
            </div>
            <div className="bg-[#EEF2F9] rounded-full px-3 py-1 text-xs font-bold text-[#1E4FA3]">
              {smartMatches.length} Matches Found
            </div>
          </div>

          <p className="text-xs text-[#6B7280] leading-relaxed">
            Our campus algorithm continuously matches Lost and Found items based on category taxonomy, keyword token overlap, and lecture hall location proximity.
          </p>

          {smartMatches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E9F2] p-10 text-center space-y-2">
              <Compass className="w-10 h-10 text-[#6B7280] mx-auto" />
              <p className="text-sm font-heading font-bold text-[#1F2328]">No high-confidence matches yet</p>
              <p className="text-xs text-[#6B7280]">As more lost and found items are logged, matching pairs will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {smartMatches.map(m => (
                <div key={m.id} className="bg-white rounded-2xl border border-[#E5E9F2] p-5 shadow-nile-card space-y-4 card-hover-spring">
                  {/* Match Confidence Score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3FA34D]"></span>
                      <span className="text-xs font-heading font-extrabold text-[#1E4FA3]">
                        {m.score}% Similarity Match
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF2F9] text-[#1E4FA3]">
                      Category: {m.lost.category}
                    </span>
                  </div>

                  {/* Two Column Comparison: Lost Item <-> Found Item */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Lost side */}
                    <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 space-y-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F25C54] text-white">
                        Lost Item
                      </span>
                      <h4 className="font-heading font-bold text-xs text-[#1F2328]">{m.lost.title}</h4>
                      <p className="text-[11px] text-[#6B7280] line-clamp-2">{m.lost.description}</p>
                      <div className="text-[10px] text-[#6B7280] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#F25C54]" />
                        <span>{m.lost.location}</span>
                      </div>
                    </div>

                    {/* Found side */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3FA34D] text-white">
                        Found Item
                      </span>
                      <h4 className="font-heading font-bold text-xs text-[#1F2328]">{m.found.title}</h4>
                      <p className="text-[11px] text-[#6B7280] line-clamp-2">{m.found.description}</p>
                      <div className="text-[10px] text-[#6B7280] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#3FA34D]" />
                        <span>{m.found.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveItem(m.found);
                        setIsClaimModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-bold btn-spring shadow-xs"
                    >
                      Connect & Claim Property →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.4 AUDIT TRAIL / SECURITY LOG TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'audit' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-motion-blur">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-[#3FA34D] uppercase tracking-widest block">
                COMPLIANCE & INTEGRITY
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#1E4FA3] tracking-tight">
                Campus Security Audit Trail
              </h2>
            </div>

            {/* Custom Audit Action Dropdown */}
            <div className="w-48">
              <CustomSelect
                value={selectedAuditAction}
                onChange={(val) => setSelectedAuditAction(val)}
                options={AUDIT_ACTIONS}
              />
            </div>
          </div>

          <p className="text-xs text-[#6B7280]">
            Tamper-evident system log tracking student authentications, item publications, verification claims, and permission enforcement.
          </p>

          <div className="bg-white rounded-2xl border border-[#E5E9F2] shadow-nile-card overflow-hidden">
            <div className="p-4 bg-[#EEF2F9] border-b border-[#E5E9F2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3FA34D] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3FA34D]"></span>
                </span>
                <span className="text-xs font-bold text-[#1E4FA3]">Live Campus Activity Trail</span>
              </div>
              <span className="text-xs text-[#6B7280] font-mono tabular-nums">
                {auditLogs.length} events logged
              </span>
            </div>

            <div className="divide-y divide-[#E5E9F2] max-h-[600px] overflow-y-auto">
              {auditLogs
                .filter(l => selectedAuditAction === 'All' || l.action === selectedAuditAction)
                .map(log => {
                  const isDenied = log.action === 'ACCESS_DENIED';
                  const isCreated = log.action === 'ITEM_CREATED';
                  const isClaim = log.action.includes('CLAIM');

                  return (
                    <div key={log.id} className="p-4 hover:bg-[#F8FAFC] transition-colors flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                              isDenied
                                ? 'bg-rose-100 text-[#F25C54]'
                                : isCreated
                                ? 'bg-emerald-100 text-[#3FA34D]'
                                : isClaim
                                ? 'bg-blue-100 text-[#1E4FA3]'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.action}
                          </span>
                          <span className="font-bold text-[#1F2328]">@{log.actor_username}</span>
                          <span className="text-[10px] text-[#6B7280]">({log.actor_role})</span>
                        </div>
                        <p className="text-[#1F2328] font-medium leading-relaxed">
                          {log.details}
                        </p>
                        <span className="text-[10px] text-[#6B7280] font-mono">
                          Client IP: {log.ip_address}
                        </span>
                      </div>

                      <div className="text-right text-[11px] font-mono tabular-nums text-[#6B7280] shrink-0">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </main>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.5 CLAIMS / INQUIRIES TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'claims' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-motion-blur">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#3FA34D] uppercase tracking-widest block">
                VERIFICATION DESK
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#1E4FA3] tracking-tight">
                My Property Claims
              </h2>
            </div>
          </div>

          <p className="text-xs text-[#6B7280]">
            Track claims you have filed to reclaim lost belongings, and view their review status.
          </p>

          {claims.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E9F2] p-10 text-center space-y-2">
              <FileCheck className="w-10 h-10 text-[#6B7280] mx-auto" />
              <p className="text-sm font-heading font-bold text-[#1F2328]">No active claims filed</p>
              <p className="text-xs text-[#6B7280]">When you find an item that belongs to you and click "This Is Mine", your claim will show here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map(claim => (
                <div key={claim.id} className="bg-white rounded-2xl border border-[#E5E9F2] p-4 shadow-nile-card flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase">
                      CLAIM ID: {claim.id}
                    </span>
                    <h4 className="font-heading font-bold text-sm text-[#1E4FA3]">
                      {claim.item_title}
                    </h4>
                    <p className="text-xs text-[#6B7280] line-clamp-1">
                      Your answer: "{claim.verification_answer}"
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      claim.status === 'Approved'
                        ? 'bg-emerald-100 text-[#3FA34D]'
                        : claim.status === 'Rejected'
                        ? 'bg-rose-100 text-[#F25C54]'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {claim.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.6 FLOATING PILL BOTTOM NAVIGATION (Marcelo Design X Spec) */}
      {/* ---------------------------------------------------- */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md bg-white border border-[#E5E9F2] rounded-full p-1.5 floating-pill-nav flex items-center justify-between shadow-nile-nav">
        {/* Tab 1: Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-full transition-all btn-spring ${
            activeTab === 'home' ? 'text-[#1E4FA3] font-bold' : 'text-[#6B7280]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[9px] uppercase tracking-wider">Home</span>
        </button>

        {/* Tab 2: Smart Matches */}
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-full transition-all btn-spring ${
            activeTab === 'matches' ? 'text-[#1E4FA3] font-bold' : 'text-[#6B7280]'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span className="text-[9px] uppercase tracking-wider">Matches</span>
        </button>

        {/* CENTER RAISED + POST BUTTON */}
        <button
          onClick={() => setIsPostChooserOpen(true)}
          className="w-12 h-12 rounded-full bg-[#1E4FA3] hover:bg-[#16397A] text-white flex items-center justify-center -translate-y-3 shadow-lg btn-spring shrink-0 mx-1"
          title="Report Lost or Found Item"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Tab 3: Claims */}
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-full transition-all btn-spring ${
            activeTab === 'claims' ? 'text-[#1E4FA3] font-bold' : 'text-[#6B7280]'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span className="text-[9px] uppercase tracking-wider">Claims</span>
        </button>

        {/* Tab 4: Audit Log */}
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-full transition-all btn-spring ${
            activeTab === 'audit' ? 'text-[#1E4FA3] font-bold' : 'text-[#6B7280]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-[9px] uppercase tracking-wider">Audit</span>
        </button>
      </nav>

      {/* ---------------------------------------------------- */}
      {/* 2.7 POST TYPE CHOOSER BOTTOM SHEET */}
      {/* ---------------------------------------------------- */}
      {isPostChooserOpen && (
        <div
          onClick={() => setIsPostChooserOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white border border-[#E5E9F2] p-6 space-y-4 shadow-2xl animate-motion-blur-dialog"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-base text-[#1E4FA3]">What happened?</h3>
              <button onClick={() => setIsPostChooserOpen(false)} className="text-[#6B7280] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setIsPostChooserOpen(false);
                  setActiveItem({ post_type: 'Lost', category: 'Electronics', status: 'Open' });
                  setIsCreateOpen(true);
                }}
                className="p-4 rounded-2xl bg-[#F25C54] text-white flex flex-col items-center justify-center gap-2 btn-spring shadow-sm"
              >
                <Search className="w-6 h-6" />
                <span className="font-heading font-extrabold text-xs uppercase tracking-wide">
                  I Lost Something
                </span>
              </button>

              <button
                onClick={() => {
                  setIsPostChooserOpen(false);
                  setActiveItem({ post_type: 'Found', category: 'Electronics', status: 'Open' });
                  setIsCreateOpen(true);
                }}
                className="p-4 rounded-2xl bg-[#3FA34D] text-white flex flex-col items-center justify-center gap-2 btn-spring shadow-sm"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-heading font-extrabold text-xs uppercase tracking-wide">
                  I Found Something
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.8 CLAIM ITEM VERIFICATION MODAL (Privacy Protection) */}
      {/* ---------------------------------------------------- */}
      {isClaimModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E9F2] p-6 shadow-2xl animate-motion-blur-dialog space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#3FA34D] uppercase tracking-wider block">
                  OWNERSHIP VERIFICATION
                </span>
                <h3 className="font-heading font-extrabold text-base text-[#1E4FA3]">
                  Claim "{activeItem.title}"
                </h3>
              </div>
              <button onClick={() => setIsClaimModalOpen(false)} className="text-[#6B7280]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed">
              To protect student belongings and prevent fraudulent claims, describe secret details only the true owner would know (e.g. wallpaper, specific scratch, lock code hint, or serial number).
            </p>

            <form onSubmit={handleSubmitClaim} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                  Secret Identifying Detail *
                </label>
                <textarea
                  required
                  rows={3}
                  value={claimVerificationAnswer}
                  onChange={(e) => setClaimVerificationAnswer(e.target.value)}
                  placeholder="e.g. Inside the battery cover my initials 'C.O.' are engraved with a blue marker."
                  className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl p-3 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
                ></textarea>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                  Your Contact Phone / Email (Shared upon verification)
                </label>
                <input
                  type="text"
                  value={claimContact}
                  onChange={(e) => setClaimContact(e.target.value)}
                  placeholder="e.g. 08012345678 or student@nileuniversity.edu.ng"
                  className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-[#6B7280] btn-spring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claimSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-heading font-bold btn-spring shadow-xs disabled:opacity-50"
                >
                  {claimSubmitting ? 'Submitting...' : 'Submit Claim Request →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.9 CREATE / EDIT ITEM MODAL (No native dropdowns!) */}
      {/* ---------------------------------------------------- */}
      {(isCreateOpen || isEditOpen) && (
        <ItemFormModal
          mode={isCreateOpen ? 'create' : 'edit'}
          initialData={activeItem || { post_type: 'Lost', category: 'Electronics', status: 'Open' }}
          onClose={() => {
            setIsCreateOpen(false);
            setIsEditOpen(false);
            setActiveItem(null);
          }}
          onSubmit={(fields, file) => {
            if (isCreateOpen) handleCreatePost(fields, file);
            else handleUpdatePost(activeItem._id || activeItem.id, fields, file);
          }}
          submitting={postSubmitting}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.10 DELETE CONFIRMATION MODAL */}
      {/* ---------------------------------------------------- */}
      {isDeleteOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-[#E5E9F2] p-6 text-center space-y-4 shadow-xl animate-motion-blur-dialog">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-[#F25C54] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-extrabold text-base text-[#1E4FA3]">Remove this post?</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Are you sure you want to permanently delete <strong>"{activeItem.title}"</strong> from the campus registry?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setIsDeleteOpen(false);
                  setActiveItem(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-[#6B7280] btn-spring"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                disabled={postSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-[#F25C54] hover:bg-rose-700 text-white text-xs font-heading font-bold btn-spring disabled:opacity-50"
              >
                {postSubmitting ? 'Deleting...' : 'Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.11 FULLSCREEN IMAGE LIGHTBOX */}
      {/* ---------------------------------------------------- */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full rounded-2xl overflow-hidden bg-white border border-[#E5E9F2] shadow-2xl animate-motion-blur-dialog"
          >
            <div className="p-3 bg-[#EEF2F9] flex items-center justify-between border-b border-[#E5E9F2]">
              <span className="text-xs font-heading font-bold text-[#1E4FA3] truncate max-w-sm">
                {lightboxImage.title}
              </span>
              <button onClick={() => setLightboxImage(null)} className="text-[#6B7280] hover:text-[#1F2328] btn-spring">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center bg-black">
              <img src={lightboxImage.url} alt={lightboxImage.title} className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.12 FLOATING TOASTS */}
      {/* ---------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold toast-slide-in border ${
              toast.type === 'success'
                ? 'bg-white text-[#3FA34D] border-[#3FA34D]/30'
                : toast.type === 'error'
                ? 'bg-white text-[#F25C54] border-[#F25C54]/30'
                : 'bg-white text-[#1E4FA3] border-[#1E4FA3]/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#3FA34D]" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[#F25C54]" />}
            {toast.type === 'info' && <Check className="w-4 h-4 shrink-0 text-[#1E4FA3]" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CUSTOM SELECT COMPONENT (Custom Dropdowns with Zero Native <select> tags)
// -----------------------------------------------------------------------------
function CustomSelect({ value, onChange, options, placeholder = 'Select...', className = '' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white border border-[#E5E9F2] hover:border-[#1E4FA3] rounded-xl px-3 py-2 text-xs font-semibold text-[#1F2328] flex items-center justify-between gap-2 shadow-2xs btn-spring focus:outline-none"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <selectedOption.icon className="w-3.5 h-3.5 text-[#1E4FA3] shrink-0" />
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#6B7280] transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-white border border-[#E5E9F2] rounded-xl shadow-xl p-1 animate-dropdown-in min-w-[140px] max-h-56 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                opt.value === value
                  ? 'bg-[#EEF2F9] text-[#1E4FA3] font-bold'
                  : 'text-[#1F2328] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {opt.icon && <opt.icon className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{opt.label}</span>
              </div>
              {opt.value === value && <Check className="w-3.5 h-3.5 text-[#1E4FA3] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ITEM FORM MODAL (Create & Edit with Custom Dropdowns and Photo Uploader)
// -----------------------------------------------------------------------------
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
      alert('Please upload an image file (JPG, PNG, WebP)');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, imageFile);
  };

  const TYPE_OPTIONS = [
    { value: 'Lost', label: 'Lost Property', icon: Search },
    { value: 'Found', label: 'Found Property', icon: CheckCircle2 }
  ];

  const FORM_CATEGORIES = CATEGORIES.filter(c => c.value !== 'All');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E5E9F2] shadow-2xl overflow-hidden animate-motion-blur-dialog">
        {/* Modal Header */}
        <div className="p-4 bg-[#EEF2F9] border-b border-[#E5E9F2] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#3FA34D] uppercase tracking-wider block">
              CAMPUS PROPERTY REGISTRY
            </span>
            <h3 className="font-heading font-extrabold text-base text-[#1E4FA3]">
              {mode === 'create' ? `Report a ${formData.post_type} Item` : 'Edit Property Report'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1F2328] btn-spring">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Post Type & Category Custom Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                Post Type
              </label>
              <CustomSelect
                value={formData.post_type}
                onChange={(val) => setFormData({ ...formData, post_type: val })}
                options={TYPE_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                Category
              </label>
              <CustomSelect
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                options={FORM_CATEGORIES}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
              Item Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Casio Scientific Calculator fx-991EX"
              className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
            />
          </div>

          {/* Location & Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                Campus Location *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Lecture Hall 3, Library 2nd Floor"
                className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                Contact Info *
              </label>
              <input
                type="text"
                required
                value={formData.contact_info}
                onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                placeholder="Phone or Student Email"
                className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
              Description & Identifying Marks *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide color, brand, stickers, scratches, or unique contents..."
              className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl p-3 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
            ></textarea>
          </div>

          {/* Real Photo Uploader */}
          <div>
            <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
              Upload Item Photo (Drag & Drop or Tap)
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-[#1E4FA3] bg-[#EEF2F9]' : 'border-[#CBD5E1] hover:border-[#1E4FA3] bg-[#F8FAFC]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative inline-block">
                  <img src={previewUrl} alt="Preview" className="h-32 rounded-xl object-cover shadow-sm mx-auto" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setPreviewUrl('');
                      setFormData({ ...formData, image_url: '' });
                    }}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-7 h-7 text-[#1E4FA3] mx-auto" />
                  <p className="text-xs font-semibold text-[#1F2328]">Drag photo here or tap to choose</p>
                  <p className="text-[10px] text-[#6B7280]">Supports JPG, PNG, WebP up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit / Cancel */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E5E9F2]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-[#6B7280] btn-spring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-heading font-bold btn-spring shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Publishing Report...' : mode === 'create' ? 'Publish Report →' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
