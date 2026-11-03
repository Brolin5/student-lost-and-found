/**
 * Student Lost & Found Platform - Frontend Application Logic
 */

// User Management & Current Session
const defaultUser = {
  id: 'student-tunde',
  name: 'Tunde Adebayo',
  role: 'student'
};

function getCurrentUser() {
  try {
    const stored = localStorage.getItem('campus_active_user');
    return stored ? JSON.parse(stored) : defaultUser;
  } catch {
    return defaultUser;
  }
}

function setCurrentUser(user) {
  localStorage.setItem('campus_active_user', JSON.stringify(user));
  state.currentUser = user;
  updateUserUI();
  renderItemsList();
}

// Application State
const state = {
  items: [],
  currentUser: getCurrentUser(),
  filters: {
    type: 'All',
    category: 'All',
    status: 'All',
    q: ''
  },
  activeEditItem: null,
  activeDeleteId: null
};

// DOM Element References (cached safely)
const elements = {
  itemsGrid: document.getElementById('items-grid'),
  loadingState: document.getElementById('loading-state'),
  emptyState: document.getElementById('empty-state'),
  toastContainer: document.getElementById('toast-container'),

  // Stats elements
  statTotal: document.getElementById('stat-total'),
  statLost: document.getElementById('stat-lost'),
  statFound: document.getElementById('stat-found'),
  statReturned: document.getElementById('stat-returned'),

  // User Profile elements
  userProfileBtn: document.getElementById('user-profile-btn'),
  userProfileMenu: document.getElementById('user-profile-menu'),
  activeUserName: document.getElementById('active-user-name'),

  // Filter elements
  typeTabs: document.querySelectorAll('.type-tab'),
  categoryFilter: document.getElementById('category-filter'),
  statusFilter: document.getElementById('status-filter'),
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),

  // Modals
  createModal: document.getElementById('create-modal'),
  openCreateModalBtn: document.getElementById('open-create-modal-btn'),
  closeCreateModalBtn: document.getElementById('close-create-modal-btn'),
  cancelCreateBtn: document.getElementById('cancel-create-btn'),
  createForm: document.getElementById('create-item-form'),

  editModal: document.getElementById('edit-modal'),
  closeEditModalBtn: document.getElementById('close-edit-modal-btn'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
  editForm: document.getElementById('edit-item-form'),

  deleteModal: document.getElementById('delete-modal'),
  closeDeleteModalBtn: document.getElementById('close-delete-modal-btn'),
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn')
};

// ----------------------------------------------------
// UI Helpers & Toast Notifications
// ----------------------------------------------------

function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '<i class="fa-solid fa-circle-check text-emerald-600 text-lg"></i>',
    error: '<i class="fa-solid fa-circle-exclamation text-rose-600 text-lg"></i>',
    info: '<i class="fa-solid fa-circle-info text-blue-600 text-lg"></i>'
  };

  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span class="flex-1">${message}</span>
    <button class="text-slate-400 hover:text-slate-600 ml-2" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatDate(isoString) {
  if (!isoString) return 'Recently';
  const date = new Date(isoString);
  const now = new Date();
  const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// User Profile / Authentication Management
// ----------------------------------------------------

function updateUserUI() {
  if (!elements.activeUserName) return;
  const user = state.currentUser;
  if (user.role === 'admin') {
    elements.activeUserName.innerHTML = `<span class="text-amber-700 font-bold">🛡️ ${escapeHtml(user.name)}</span>`;
  } else {
    elements.activeUserName.textContent = user.name;
  }
}

window.switchUser = (id, name, role) => {
  setCurrentUser({ id, name, role });
  if (elements.userProfileMenu) {
    elements.userProfileMenu.classList.add('hidden');
  }
  showToast(`Switched active profile to: ${name}`, 'info');
};

window.promptCustomUser = () => {
  const name = prompt('Enter your full name or student username:');
  if (name && name.trim()) {
    const cleanName = name.trim();
    const id = 'student-' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    switchUser(id, cleanName, 'student');
  }
};

if (elements.userProfileBtn && elements.userProfileMenu) {
  elements.userProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.userProfileMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!elements.userProfileBtn.contains(e.target) && !elements.userProfileMenu.contains(e.target)) {
      elements.userProfileMenu.classList.add('hidden');
    }
  });
}

// ----------------------------------------------------
// Data Loading & Statistics
// ----------------------------------------------------

async function loadDashboardStats() {
  try {
    const res = await API.getStats();
    if (res.success && res.data) {
      if (elements.statTotal) elements.statTotal.textContent = res.data.total;
      if (elements.statLost) elements.statLost.textContent = res.data.lost;
      if (elements.statFound) elements.statFound.textContent = res.data.found;
      if (elements.statReturned) elements.statReturned.textContent = res.data.returned + res.data.claimed;
    }
  } catch (err) {
    console.warn('Failed to refresh stats:', err.message);
  }
}

async function loadItems() {
  if (elements.loadingState) elements.loadingState.classList.remove('hidden');
  if (elements.itemsGrid) elements.itemsGrid.classList.add('hidden');
  if (elements.emptyState) elements.emptyState.classList.add('hidden');

  try {
    const res = await API.getItems(state.filters);
    state.items = res.data || [];
    renderItemsList();
  } catch (err) {
    if (elements.loadingState) elements.loadingState.classList.add('hidden');
    showToast(`Error loading items: ${err.message}`, 'error');
  }
}

// ----------------------------------------------------
// Rendering Items with Post Ownership Controls
// ----------------------------------------------------

function renderItemsList() {
  if (elements.loadingState) elements.loadingState.classList.add('hidden');

  if (!state.items || state.items.length === 0) {
    if (elements.itemsGrid) elements.itemsGrid.classList.add('hidden');
    if (elements.emptyState) elements.emptyState.classList.remove('hidden');
    return;
  }

  if (elements.emptyState) elements.emptyState.classList.add('hidden');
  if (elements.itemsGrid) {
    elements.itemsGrid.classList.remove('hidden');

    elements.itemsGrid.innerHTML = state.items.map(item => {
      const id = item._id || item.id;
      const isLost = item.post_type === 'Lost';
      const typeBadgeClass = isLost ? 'badge-lost' : 'badge-found';
      const typeIcon = isLost ? 'fa-magnifying-glass' : 'fa-hand-holding-hand';

      let statusBadgeClass = 'status-open';
      if (item.status === 'Claimed') statusBadgeClass = 'status-claimed';
      if (item.status === 'Returned') statusBadgeClass = 'status-returned';

      // Ownership Check: Current user owns this post OR is an admin
      const isOwner = (state.currentUser.role === 'admin') || 
                      (item.creator_id && item.creator_id === state.currentUser.id);

      return `
        <div class="item-card bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between" data-id="${id}">
          <div>
            <!-- Top Badges Row -->
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeBadgeClass}">
                <i class="fa-solid ${typeIcon}"></i> ${item.post_type}
              </span>
              <div class="flex items-center gap-2">
                <span class="text-xs px-2.5 py-1 rounded-full font-medium ${statusBadgeClass}">
                  ${item.status}
                </span>
                <span class="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                  ${item.category}
                </span>
              </div>
            </div>

            <!-- Ownership Pill -->
            <div class="mb-2">
              ${isOwner 
                ? `<span class="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold border border-blue-200/60">
                     <i class="fa-solid fa-user-check text-[10px]"></i> Your Post
                   </span>` 
                : `<span class="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/50">
                     <i class="fa-solid fa-user text-[10px] text-slate-400"></i> ${escapeHtml(item.creator_name || 'Student')}
                   </span>`
              }
            </div>

            <!-- Title -->
            <h3 class="text-lg font-semibold text-slate-900 mb-1 leading-snug hover:text-blue-600 transition-colors">
              ${escapeHtml(item.title)}
            </h3>

            <!-- Location -->
            <div class="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
              <i class="fa-solid fa-location-dot text-rose-500"></i>
              <span class="font-medium">${escapeHtml(item.location)}</span>
              <span class="text-slate-300">•</span>
              <span>${formatDate(item.created_at)}</span>
            </div>

            <!-- Description -->
            <p class="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed">
              ${escapeHtml(item.description)}
            </p>

            <!-- Contact Info Box -->
            <div class="bg-slate-50 border border-slate-200/60 rounded-lg p-2.5 text-xs text-slate-700 flex items-center gap-2 mb-4">
              <i class="fa-solid fa-address-card text-blue-500 text-sm"></i>
              <div>
                <span class="text-slate-400 block font-normal">Contact / Reporter:</span>
                <span class="font-medium select-all">${escapeHtml(item.contact_info)}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Action Area -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            ${isOwner ? `
              <!-- Quick Status Changer (Only for Owner or Admin) -->
              <select 
                onchange="handleQuickStatusChange('${id}', this.value)" 
                class="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                title="Change Status"
              >
                <option value="Open" ${item.status === 'Open' ? 'selected' : ''}>Status: Open</option>
                <option value="Claimed" ${item.status === 'Claimed' ? 'selected' : ''}>Status: Claimed</option>
                <option value="Returned" ${item.status === 'Returned' ? 'selected' : ''}>Status: Returned</option>
              </select>

              <div class="flex items-center gap-1.5">
                <button 
                  onclick="openEditModal('${id}')" 
                  class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit My Post"
                >
                  <i class="fa-solid fa-pen-to-square text-sm"></i>
                </button>
                <button 
                  onclick="openDeleteModal('${id}', '${escapeHtml(item.title).replace(/'/g, "\\'")}')" 
                  class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete My Post"
                >
                  <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
              </div>
            ` : `
              <!-- Protected Post (Belongs to someone else) -->
              <div class="w-full flex items-center justify-between text-xs text-slate-400 py-1">
                <span class="flex items-center gap-1.5">
                  <i class="fa-solid fa-lock text-slate-300"></i>
                  <span>Protected (Created by ${escapeHtml(item.creator_name || 'student')})</span>
                </span>
                <span class="text-slate-400 font-medium">Contact to claim</span>
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');
  }
}

// ----------------------------------------------------
// CRUD: CREATE Item
// ----------------------------------------------------

if (elements.openCreateModalBtn && elements.createModal) {
  elements.openCreateModalBtn.addEventListener('click', () => {
    if (elements.createForm) elements.createForm.reset();
    elements.createModal.classList.remove('modal-hidden');
    elements.createModal.classList.add('modal-visible');
  });
}

function closeCreateModal() {
  if (elements.createModal) {
    elements.createModal.classList.remove('modal-visible');
    elements.createModal.classList.add('modal-hidden');
  }
}

if (elements.closeCreateModalBtn) elements.closeCreateModalBtn.addEventListener('click', closeCreateModal);
if (elements.cancelCreateBtn) elements.cancelCreateBtn.addEventListener('click', closeCreateModal);

if (elements.createForm) {
  elements.createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(elements.createForm);

    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      post_type: formData.get('post_type'),
      category: formData.get('category'),
      location: formData.get('location'),
      contact_info: formData.get('contact_info'),
      status: 'Open'
    };

    if (!payload.title || !payload.description || !payload.location || !payload.contact_info) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const submitBtn = elements.createForm.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting...';
    }

    try {
      const res = await API.createItem(payload);
      closeCreateModal();
      showToast(res.message || 'Item posted successfully!', 'success');
      await loadItems();
      await loadDashboardStats();
    } catch (err) {
      showToast(`Submission failed: ${err.message}`, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  });
}

// ----------------------------------------------------
// CRUD: UPDATE Item
// ----------------------------------------------------

window.openEditModal = async (id) => {
  try {
    const res = await API.getItemById(id);
    const item = res.data;
    state.activeEditItem = item;

    document.getElementById('edit-item-id').value = item._id || item.id;
    document.getElementById('edit-title').value = item.title;
    document.getElementById('edit-description').value = item.description;
    document.getElementById('edit-category').value = item.category;
    document.getElementById('edit-location').value = item.location;
    document.getElementById('edit-contact-info').value = item.contact_info;
    document.getElementById('edit-status').value = item.status;

    const radios = document.getElementsByName('edit_post_type');
    radios.forEach(r => {
      r.checked = (r.value === item.post_type);
    });

    if (elements.editModal) {
      elements.editModal.classList.remove('modal-hidden');
      elements.editModal.classList.add('modal-visible');
    }
  } catch (err) {
    showToast(`Failed to open edit modal: ${err.message}`, 'error');
  }
};

function closeEditModal() {
  if (elements.editModal) {
    elements.editModal.classList.remove('modal-visible');
    elements.editModal.classList.add('modal-hidden');
  }
  state.activeEditItem = null;
}

if (elements.closeEditModalBtn) elements.closeEditModalBtn.addEventListener('click', closeEditModal);
if (elements.cancelEditBtn) elements.cancelEditBtn.addEventListener('click', closeEditModal);

if (elements.editForm) {
  elements.editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-item-id').value;
    const formData = new FormData(elements.editForm);

    const payload = {
      title: formData.get('edit-title'),
      description: formData.get('edit-description'),
      post_type: formData.get('edit_post_type'),
      category: formData.get('edit-category'),
      location: formData.get('edit-location'),
      contact_info: formData.get('edit-contact-info'),
      status: formData.get('edit-status')
    };

    const submitBtn = elements.editForm.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...';
    }

    try {
      const res = await API.updateItem(id, payload);
      closeEditModal();
      showToast(res.message || 'Item updated successfully!', 'success');
      await loadItems();
      await loadDashboardStats();
    } catch (err) {
      showToast(`Update failed: ${err.message}`, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  });
}

window.handleQuickStatusChange = async (id, newStatus) => {
  try {
    await API.updateItem(id, { status: newStatus });
    showToast(`Status updated to "${newStatus}"`, 'success');
    await loadItems();
    await loadDashboardStats();
  } catch (err) {
    showToast(`Failed to update status: ${err.message}`, 'error');
    await loadItems();
  }
};

// ----------------------------------------------------
// CRUD: DELETE Item
// ----------------------------------------------------

window.openDeleteModal = (id, title) => {
  state.activeDeleteId = id;
  const titleEl = document.getElementById('delete-item-title');
  if (titleEl) titleEl.textContent = title;
  if (elements.deleteModal) {
    elements.deleteModal.classList.remove('modal-hidden');
    elements.deleteModal.classList.add('modal-visible');
  }
};

function closeDeleteModal() {
  if (elements.deleteModal) {
    elements.deleteModal.classList.remove('modal-visible');
    elements.deleteModal.classList.add('modal-hidden');
  }
  state.activeDeleteId = null;
}

if (elements.closeDeleteModalBtn) {
  elements.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
}
if (elements.cancelDeleteBtn) {
  elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}

if (elements.confirmDeleteBtn) {
  elements.confirmDeleteBtn.addEventListener('click', async () => {
    if (!state.activeDeleteId) return;

    const btn = elements.confirmDeleteBtn;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Deleting...';

    try {
      await API.deleteItem(state.activeDeleteId);
      closeDeleteModal();
      showToast('Item deleted successfully', 'success');
      await loadItems();
      await loadDashboardStats();
    } catch (err) {
      showToast(`Failed to delete: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}

// ----------------------------------------------------
// Filter & Search Handlers
// ----------------------------------------------------

elements.typeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    elements.typeTabs.forEach(t => {
      t.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
      t.classList.add('text-slate-600', 'hover:bg-slate-100');
    });
    tab.classList.remove('text-slate-600', 'hover:bg-slate-100');
    tab.classList.add('bg-blue-600', 'text-white', 'shadow-sm');

    state.filters.type = tab.dataset.type;
    loadItems();
  });
});

if (elements.categoryFilter) {
  elements.categoryFilter.addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    loadItems();
  });
}

if (elements.statusFilter) {
  elements.statusFilter.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    loadItems();
  });
}

let searchTimeout;
if (elements.searchInput) {
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const val = e.target.value.trim();
    if (elements.clearSearchBtn) {
      elements.clearSearchBtn.classList.toggle('hidden', val.length === 0);
    }

    searchTimeout = setTimeout(() => {
      state.filters.q = val;
      loadItems();
    }, 300);
  });
}

if (elements.clearSearchBtn && elements.searchInput) {
  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.classList.add('hidden');
    state.filters.q = '';
    loadItems();
  });
}

// Backdrop modal click listener
[elements.createModal, elements.editModal, elements.deleteModal].forEach(modal => {
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('modal-visible');
        modal.classList.add('modal-hidden');
      }
    });
  }
});

// ----------------------------------------------------
// Safe App Initialization
// ----------------------------------------------------
function initApp() {
  updateUserUI();
  loadDashboardStats();
  loadItems();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
