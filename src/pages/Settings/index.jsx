import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiUserLine, RiHomeLine, RiBellLine, RiShieldLine,
  RiSaveLine, RiSmartphoneLine, RiGlobalLine,
} from 'react-icons/ri';
import { selectAuthUser, updateAuthProfile, changePassword } from '../../store/slices/authSlice';
import { patchPropertySettings, patchNotifSettings } from '../../store/slices/settingsSlice';
import { useGetQuery, usePutMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { getInitials } from '../../utils/getInitials';
import { Field, Input, Select, Textarea, FormGrid } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const TABS = [
  { id: 'profile',  label: 'Profile',       icon: RiUserLine  },
  { id: 'property', label: 'Property',       icon: RiHomeLine  },
  { id: 'notifs',   label: 'Notifications',  icon: RiBellLine  },
  { id: 'security', label: 'Security',       icon: RiShieldLine },
];

const EMIRATES   = ['Dubai','Abu Dhabi','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah'];
const CURRENCIES = ['AED','USD','GBP','EUR','SAR','QAR'];
const LANGUAGES  = ['English','Arabic','Urdu','Hindi'];

const DEFAULT_NOTIFS = {
  maintenance: true, repairs: true, warranties: true,
  contracts: true, expenses: false, carAlerts: true, salaryAlerts: false,
};

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Settings</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Manage your profile, property details and preferences</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn('w-full flex items-center gap-3 px-4 py-3.5 text-[13px] font-semibold transition-all text-left border-b border-slate-50 last:border-b-0',
                  tab === t.id ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-50')}>
                <t.icon className="w-4 h-4 shrink-0" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
              {tab === 'profile'  && <ProfileTab />}
              {tab === 'property' && <PropertyTab />}
              {tab === 'notifs'   && <NotifsTab />}
              {tab === 'security' && <SecurityTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
      {(title || subtitle) && (
        <div className="px-6 py-5 border-b border-slate-100">
          {title    && <h2 className="text-[15px] font-bold text-navy-900">{title}</h2>}
          {subtitle && <p className="text-[13px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-b-0">
      <div>
        <p className="text-[13px] font-semibold text-slate-800">{label}</p>
        {description && <p className="text-[12px] text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
        className={cn('relative w-11 h-6 rounded-full transition-all shrink-0 mt-0.5', checked ? 'bg-accent-500' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

function ProfileTab() {
  const dispatch = useDispatch();
  const authUser = useSelector(selectAuthUser);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (!authUser) return;
    reset({ name: authUser.name || '', phone: authUser.phone || '' });
  }, [authUser]);

  const onSubmit = async (d) => {
    const res = await dispatch(updateAuthProfile({ name: d.name, phone: d.phone }));
    if (res.error) { toast.error('Failed to save profile'); return; }
    toast.success('Profile saved!');
  };

  return (
    <SettingsCard title="Personal Profile" subtitle="Your name and contact details">
      <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
        <div className="w-14 h-14 rounded-full bg-navy-900 flex items-center justify-center text-white text-[18px] font-bold shrink-0">
          {getInitials(authUser?.name)}
        </div>
        <div>
          <p className="text-[14px] font-bold text-slate-900">{authUser?.name || '—'}</p>
          <p className="text-[13px] text-slate-500">{authUser?.email}</p>
          <span className={cn(
            'inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold',
            authUser?.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600',
          )}>
            {authUser?.role === 'admin' ? 'Admin' : 'Viewer'}
          </span>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Full Name" required>
          <Input {...register('name', { required: true })} placeholder="Your full name" />
        </Field>
        <Field label="Phone">
          <div className="relative">
            <RiSmartphoneLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input {...register('phone')} placeholder="+971 50 XXX XXXX" style={{ paddingLeft: '2.5rem' }} />
          </div>
        </Field>
        <div className="flex justify-end pt-2">
          <Button variant="primary" icon={RiSaveLine} type="submit">Save Profile</Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function PropertyTab() {
  const dispatch    = useDispatch();
  // Settings are per-user, not per-property — no params needed
  const { data: settings = {} } = useGetQuery({ path: '/settings' });
  const [savePropertyMut] = usePutMutation();
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (settings?.property) reset(settings.property);
  }, [settings]);

  const onSubmit = async (d) => {
    try {
      await savePropertyMut({ path: '/settings/property', body: d }).unwrap();
      dispatch(patchPropertySettings(d));
      toast.success('Property settings saved!');
    } catch {
      toast.error('Failed to save property settings');
    }
  };

  return (
    <SettingsCard title="Property Details" subtitle="Villa information and global display preferences">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Property Name / Reference">
          <Input {...register('propertyName')} placeholder="e.g. Shah House — Palm Jumeirah" />
        </Field>
        <FormGrid>
          <Field label="Emirate">
            <Select {...register('emirate')} placeholder="Select emirate" options={EMIRATES.map((e) => ({ value: e, label: e }))} />
          </Field>
          <Field label="Community / District">
            <Input {...register('community')} placeholder="e.g. Palm Jumeirah, JBR" />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Plot / Villa Number"><Input {...register('plotNumber')} placeholder="e.g. 42-B" /></Field>
          <Field label="Built Up Area (sqft)"><Input {...register('builtArea')} type="number" placeholder="6500" /></Field>
          <Field label="Plot Area (sqft)"><Input {...register('plotArea')} type="number" placeholder="9000" /></Field>
          <Field label="Year Built"><Input {...register('yearBuilt')} type="number" placeholder="2021" /></Field>
        </FormGrid>
        <FormGrid>
          <Field label="Currency" hint="Used across all financial displays">
            <Select {...register('currency')} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Language">
            <div className="relative">
              <RiGlobalLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Select {...register('language')} options={LANGUAGES.map((l) => ({ value: l, label: l }))} style={{ paddingLeft: '2.5rem' }} />
            </div>
          </Field>
        </FormGrid>
        <Field label="DEWA Account No.">
          <Input {...register('dewaAccount')} placeholder="DEWA account number" />
        </Field>
        <Field label="Additional Notes">
          <Textarea {...register('notes')} rows={2} placeholder="Special notes about the property…" />
        </Field>
        <div className="flex justify-end pt-2">
          <Button variant="primary" icon={RiSaveLine} type="submit">Save Property</Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function NotifsTab() {
  const dispatch = useDispatch();
  const { data: notifSettings = {} } = useGetQuery({ path: '/settings/notifications' });
  const [saveNotifMut] = usePutMutation();
  const [local, setLocal] = useState(DEFAULT_NOTIFS);

  useEffect(() => {
    if (notifSettings && Object.keys(notifSettings).length > 0) {
      setLocal((prev) => ({ ...DEFAULT_NOTIFS, ...prev, ...notifSettings }));
    }
  }, [notifSettings]);

  const toggle = (k) => setLocal((p) => ({ ...p, [k]: !p[k] }));

  const onSave = async () => {
    try {
      await saveNotifMut({ path: '/settings/notifications', body: local }).unwrap();
      dispatch(patchNotifSettings(local));
      toast.success('Notification preferences saved!');
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  return (
    <SettingsCard title="Notification Preferences" subtitle="Choose what alerts you want to receive">
      <div className="space-y-1">
        <Toggle checked={local.maintenance}  onChange={() => toggle('maintenance')}  label="Maintenance Reminders"    description="Upcoming scheduled maintenance tasks" />
        <Toggle checked={local.repairs}      onChange={() => toggle('repairs')}      label="Repair Alerts"           description="Status changes on open repairs" />
        <Toggle checked={local.warranties}   onChange={() => toggle('warranties')}   label="Warranty Expiry"         description="Alerts 90 and 30 days before expiry" />
        <Toggle checked={local.contracts}    onChange={() => toggle('contracts')}    label="Contract Renewals"       description="Service contracts due for renewal" />
        <Toggle checked={local.carAlerts}    onChange={() => toggle('carAlerts')}    label="Car Registration & Insurance" description="Vehicle registration and insurance expiry alerts" />
        <Toggle checked={local.expenses}     onChange={() => toggle('expenses')}     label="Monthly Expense Summary" description="Monthly spending digest via email" />
        <Toggle checked={local.salaryAlerts} onChange={() => toggle('salaryAlerts')} label="Salary Payment Reminders" description="Alerts before employee salary due dates" />
      </div>
      <div className="flex justify-end pt-4">
        <Button variant="primary" icon={RiSaveLine} onClick={onSave}>Save Preferences</Button>
      </div>
    </SettingsCard>
  );
}

function SecurityTab() {
  const dispatch = useDispatch();
  const { register, handleSubmit, reset, watch, setError, formState: { errors } } = useForm();
  const [busy, setBusy] = useState(false);
  const newPw = watch('newPassword', '');

  const onSubmit = async (d) => {
    if (d.newPassword !== d.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    setBusy(true);
    const res = await dispatch(changePassword({ currentPassword: d.currentPassword, newPassword: d.newPassword }));
    setBusy(false);
    if (res.error) { toast.error(res.payload || 'Failed to change password'); return; }
    toast.success('Password changed successfully!');
    reset();
  };

  return (
    <SettingsCard title="Security" subtitle="Change your login password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Current Password" required>
          <Input {...register('currentPassword', { required: 'Required' })} type="password" placeholder="Enter current password" />
          {errors.currentPassword && <p className="text-[12px] text-danger-500 mt-1">{errors.currentPassword.message}</p>}
        </Field>
        <Field label="New Password" required hint="Minimum 6 characters">
          <Input {...register('newPassword', { required: 'Required', minLength: { value: 6, message: 'Minimum 6 characters' } })} type="password" placeholder="New password" />
          {errors.newPassword && <p className="text-[12px] text-danger-500 mt-1">{errors.newPassword.message}</p>}
        </Field>
        <Field label="Confirm New Password" required>
          <Input {...register('confirmPassword', { required: 'Required', validate: (v) => v === newPw || 'Passwords do not match' })} type="password" placeholder="Repeat new password" />
          {errors.confirmPassword && <p className="text-[12px] text-danger-500 mt-1">{errors.confirmPassword.message}</p>}
        </Field>
        <div className="flex justify-end pt-2">
          <Button variant="primary" icon={busy ? null : RiShieldLine} type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Update Password'}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}
