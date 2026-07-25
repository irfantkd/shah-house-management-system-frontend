import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiShieldUserLine,
  RiUserLine, RiMailLine, RiSmartphoneLine, RiLockPasswordLine,
  RiTeamLine, RiCheckLine, RiCloseLine, RiEyeLine, RiEyeOffLine,
  RiShieldLine,
} from 'react-icons/ri';
import { getInitials } from '../../utils/getInitials';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation, usePatchMutation } from '../../api/apiSlice';
import { selectAuthUser } from '../../store/slices/authSlice';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, FormGrid } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const AVATAR_COLORS = ['#0b1d3a','#1e40af','#7c3aed','#0f766e','#b45309','#be185d','#0e7490'];
const avatarColor   = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ── Shared password field with eye toggle ─────────────────────── */
function PasswordField({ label, id, registration, placeholder, hint, error, required }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} required={required} hint={hint}>
      <div className="relative">
        <Input
          {...registration}
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          style={{ paddingRight: '2.75rem' }}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <RiEyeOffLine className="w-4 h-4" /> : <RiEyeLine className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-[12px] text-danger-500 mt-1">{error}</p>}
    </Field>
  );
}

/* ── Avatar circle ─────────────────────────────────────────────── */
function UserAvatar({ user, size = 9 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none"
      style={{
        width: size * 4, height: size * 4,
        background: avatarColor(user.name),
        fontSize: size > 8 ? 15 : 12,
      }}
    >
      {getInitials(user.name)}
    </div>
  );
}

function RoleBadge({ role }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
      role === 'admin'
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-slate-100 text-slate-600 border border-slate-200',
    )}>
      {role === 'admin' && <RiShieldUserLine className="w-3 h-3" />}
      {role === 'admin' ? 'Admin' : 'Viewer'}
    </span>
  );
}

function StatusPill({ status }) {
  const active = status === 'active';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
      active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200',
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-300')} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════════ */
export default function UsersPage() {
  const authUser  = useSelector(selectAuthUser);
  const { data: users = [] } = useGetQuery({ path: '/users' });
  const [addUserMut]    = usePostMutation();
  const [updateUserMut] = usePutMutation();
  const [deleteUserMut] = useDeleteMutation();
  const [resetPassMut]  = usePatchMutation();

  const [modal,     setModal]     = useState(null);
  const [pwModal,   setPwModal]   = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const stats = {
    total:    users.length,
    active:   users.filter((u) => u.status === 'active').length,
    admin:    users.filter((u) => u.role === 'admin').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">User Management</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Create and manage system access accounts</p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Add User</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',  value: stats.total,    grad: 'from-navy-800 to-navy-600',    icon: RiTeamLine       },
          { label: 'Active',       value: stats.active,   grad: 'from-emerald-600 to-teal-600', icon: RiCheckLine      },
          { label: 'Admins',       value: stats.admin,    grad: 'from-amber-500 to-orange-500', icon: RiShieldUserLine },
          { label: 'Inactive',     value: stats.inactive, grad: 'from-slate-500 to-slate-700',  icon: RiCloseLine      },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={cn('rounded-2xl p-5 text-white flex items-center gap-4 bg-linear-to-br', s.grad)}>
            <s.icon className="w-8 h-8 opacity-75 shrink-0" />
            <div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-[12px] text-white/70 mt-1">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
        {users.length === 0 ? (
          <div className="p-14 text-center">
            <RiTeamLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-400">No users yet</p>
            <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Add first user</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                  {users.map((u, i) => {
                    const isSelf = u.id === authUser?.id;
                    return (
                      <motion.tr key={u.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={u} size={9} />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-bold text-slate-900 leading-tight">{u.name}</p>
                                {isSelf && (
                                  <span className="text-[10px] font-bold text-accent-500 bg-accent-50 border border-accent-200 px-1.5 py-0.5 rounded-full">You</span>
                                )}
                              </div>
                              <p className="text-[12px] text-slate-400 sm:hidden">{u.email}</p>
                              {u.phone && <p className="text-[11px] text-slate-400 hidden sm:block">{u.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <p className="text-[13px] text-slate-600 font-medium">{u.email}</p>
                        </td>
                        <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                        <td className="px-6 py-4 hidden md:table-cell"><StatusPill status={u.status} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setPwModal(u)} title="Reset password"
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-all">
                              <RiLockPasswordLine className="w-4 h-4" />
                            </button>
                            <button onClick={() => setModal(u)} title="Edit user"
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-accent-50 hover:text-accent-600 transition-all">
                              <RiEditLine className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => !isSelf && setDelTarget(u)}
                              title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                              className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                                isSelf
                                  ? 'text-slate-200 cursor-not-allowed'
                                  : 'text-slate-400 hover:bg-danger-50 hover:text-danger-500')}>
                              <RiDeleteBinLine className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserModal
        open={modal !== null}
        user={modal !== 'add' ? modal : null}
        isSelf={modal !== 'add' && modal?.id === authUser?.id}
        onClose={() => setModal(null)}
        onSave={async (data) => {
          try {
            if (modal !== 'add') {
              await updateUserMut({ path: `/users/${modal.id}`, body: data }).unwrap();
              toast.success('User updated successfully!');
            } else {
              await addUserMut({ path: '/users', body: data }).unwrap();
              toast.success('User created successfully!');
            }
            setModal(null);
          } catch (err) { toast.error(err.data?.error || 'Failed to save user'); }
        }}
      />

      <ResetPasswordModal
        open={!!pwModal}
        user={pwModal}
        onClose={() => setPwModal(null)}
        onSave={async ({ newPassword }) => {
          try {
            await resetPassMut({ path: `/users/${pwModal.id}/reset-password`, body: { newPassword } }).unwrap();
            toast.success(`Password reset for ${pwModal.name}`);
            setPwModal(null);
          } catch (err) { toast.error(err.data?.error || 'Reset failed'); }
        }}
      />

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={async () => {
          try { await deleteUserMut({ path: `/users/${delTarget.id}` }).unwrap(); toast.success('User deleted'); }
          catch (err) { toast.error(err.data?.error || 'Delete failed'); }
          setDelTarget(null);
        }}
        title="Delete User"
        message={`Permanently delete "${delTarget?.name}" (${delTarget?.email})? This cannot be undone.`}
      />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Add / Edit User modal
═══════════════════════════════════════════════════════════════ */
function UserModal({ open, user, isSelf, onClose, onSave }) {
  const isEdit = !!user;
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const password = watch('password', '');

  useEffect(() => {
    if (!open) return;
    reset(isEdit ? {
      name:   user.name,
      email:  user.email,
      phone:  user.phone || '',
      role:   user.role,
      status: user.status,
    } : { role: 'viewer', status: 'active' });
  }, [open, user]);

  return (
    <Modal open={open} onClose={onClose} size="md"
      title={isEdit ? 'Edit User' : 'Create New User'}
      subtitle={isEdit ? 'Update account details and permissions' : 'Set up a new system user account'}>
      <form onSubmit={handleSubmit(onSave)} className="space-y-5">

        {/* Name */}
        <Field label="Full Name" required>
          <div className="relative">
            <RiUserLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g. Ahmad Al Rashidi"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          {errors.name && <p className="text-[12px] text-danger-500 mt-1">{errors.name.message}</p>}
        </Field>

        {/* Email */}
        <Field label="Email Address" required>
          <div className="relative">
            <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' } })}
              type="email"
              placeholder="user@example.com"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          {errors.email && <p className="text-[12px] text-danger-500 mt-1">{errors.email.message}</p>}
        </Field>

        {/* Phone */}
        <Field label="Phone Number" hint="Optional">
          <div className="relative">
            <RiSmartphoneLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input {...register('phone')} placeholder="+971 50 XXX XXXX" style={{ paddingLeft: '2.5rem' }} />
          </div>
        </Field>

        {/* Password fields — only for new users */}
        {!isEdit && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Set Password</p>
            <PasswordField
              label="Password"
              id="password"
              required
              placeholder="Minimum 6 characters"
              hint="At least 6 characters"
              registration={register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Minimum 6 characters' },
              })}
              error={errors.password?.message}
            />
            <PasswordField
              label="Confirm Password"
              id="confirmPassword"
              required
              placeholder="Repeat the password"
              registration={register('confirmPassword', {
                required: 'Please confirm the password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
              error={errors.confirmPassword?.message}
            />
          </div>
        )}

        {/* Role + Status */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Permissions</p>
          <FormGrid>
            <Field label="Role" hint={isSelf ? 'Cannot change own role' : undefined}>
              <Select
                {...register('role')}
                disabled={isSelf}
                options={[
                  { value: 'viewer', label: 'Viewer — read access' },
                  { value: 'admin',  label: 'Admin — full access'  },
                ]}
              />
            </Field>
            <Field label="Status" hint={isSelf ? 'Cannot change own status' : undefined}>
              <Select
                {...register('status')}
                disabled={isSelf}
                options={[
                  { value: 'active',   label: 'Active'   },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </Field>
          </FormGrid>
          {isSelf && (
            <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mt-3">
              You cannot change your own role or status.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Admin Reset Password modal
═══════════════════════════════════════════════════════════════ */
function ResetPasswordModal({ open, user, onClose, onSave }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const newPw = watch('newPassword', '');

  useEffect(() => { if (!open) reset(); }, [open]);

  return (
    <Modal open={open} onClose={onClose} size="sm"
      title="Reset Password"
      subtitle={user ? `Set a new password for ${user.name}` : ''}>
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">

        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <RiShieldLine className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[12px] text-amber-700">The user will need to use the new password on their next sign-in.</p>
        </div>

        <PasswordField
          label="New Password"
          id="newPassword"
          required
          placeholder="Minimum 6 characters"
          hint="At least 6 characters"
          registration={register('newPassword', {
            required: 'Required',
            minLength: { value: 6, message: 'Minimum 6 characters' },
          })}
          error={errors.newPassword?.message}
        />

        <PasswordField
          label="Confirm New Password"
          id="confirmNew"
          required
          placeholder="Repeat the password"
          registration={register('confirmNew', {
            required: 'Required',
            validate: (v) => v === newPw || 'Passwords do not match',
          })}
          error={errors.confirmNew?.message}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={RiLockPasswordLine} type="submit">Reset Password</Button>
        </div>
      </form>
    </Modal>
  );
}
