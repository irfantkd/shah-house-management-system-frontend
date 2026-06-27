import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiUserLine, RiHomeLine, RiBellLine, RiShieldLine,
  RiSaveLine, RiSmartphoneLine, RiMailLine,
} from 'react-icons/ri';
import { selectProfile, selectProperty, selectNotifSettings, saveProfile, saveProperty, saveNotifSettings } from '../../store/slices/settingsSlice';
import { Field, Input, Select, Textarea, FormGrid } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const TABS = [
  { id: 'profile',  label: 'Profile',       icon: RiUserLine  },
  { id: 'property', label: 'Property',       icon: RiHomeLine  },
  { id: 'notifs',   label: 'Notifications',  icon: RiBellLine  },
  { id: 'security', label: 'Security',       icon: RiShieldLine },
];

const EMIRATES  = ['Dubai','Abu Dhabi','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah'];
const CURRENCIES = ['AED','USD','GBP','EUR'];
const LANGUAGES  = ['English','Arabic','Urdu','Hindi'];

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
  const profile  = useSelector(selectProfile);
  const { register, handleSubmit, reset } = useForm();
  useEffect(() => { reset(profile ?? {}); }, [profile]);
  return (
    <SettingsCard title="Personal Profile" subtitle="Your name and contact details">
      <form onSubmit={handleSubmit((d) => { dispatch(saveProfile(d)); toast.success('Profile saved!'); })} className="space-y-5">
        <FormGrid>
          <Field label="First Name"><Input {...register('firstName')} placeholder="Amir" /></Field>
          <Field label="Last Name"><Input {...register('lastName')} placeholder="Al Rashidi" /></Field>
        </FormGrid>
        <FormGrid>
          <Field label="Email">
            <div className="relative">
              <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input {...register('email')} type="email" placeholder="owner@villa.ae" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </Field>
          <Field label="Phone">
            <div className="relative">
              <RiSmartphoneLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input {...register('phone')} placeholder="+971 50 XXX XXXX" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </Field>
        </FormGrid>
        <Field label="Language">
          <Select {...register('language')} placeholder="Select language" options={LANGUAGES.map((l) => ({ value: l, label: l }))} />
        </Field>
        <div className="flex justify-end pt-2">
          <Button variant="primary" icon={RiSaveLine} type="submit">Save Profile</Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function PropertyTab() {
  const dispatch  = useDispatch();
  const property  = useSelector(selectProperty);
  const { register, handleSubmit, reset } = useForm();
  useEffect(() => { reset(property ?? {}); }, [property]);
  return (
    <SettingsCard title="Property Details" subtitle="Villa information and configuration">
      <form onSubmit={handleSubmit((d) => { dispatch(saveProperty(d)); toast.success('Property saved!'); })} className="space-y-5">
        <Field label="Property Name / Reference">
          <Input {...register('propertyName')} placeholder="e.g. Villa Al Noor — Palm Jumeirah" />
        </Field>
        <FormGrid>
          <Field label="Emirate">
            <Select {...register('emirate')} placeholder="Select emirate" options={EMIRATES.map((e) => ({ value: e, label: e }))} />
          </Field>
          <Field label="Community / District">
            <Input {...register('community')} placeholder="e.g. Al Barsha, JBR" />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Plot / Villa Number"><Input {...register('plotNumber')} placeholder="e.g. 42-B" /></Field>
          <Field label="Built Up Area (sqft)"><Input {...register('builtArea')} type="number" placeholder="6500" /></Field>
          <Field label="Plot Area (sqft)"><Input {...register('plotArea')} type="number" placeholder="9000" /></Field>
          <Field label="Year Built"><Input {...register('yearBuilt')} type="number" placeholder="2019" /></Field>
        </FormGrid>
        <FormGrid>
          <Field label="Currency">
            <Select {...register('currency')} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="DEWA Account No."><Input {...register('dewaAccount')} placeholder="DEWA account" /></Field>
        </FormGrid>
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
  const dispatch  = useDispatch();
  const settings  = useSelector(selectNotifSettings) ?? {};
  const [local, setLocal] = useState({ maintenance: true, repairs: true, warranties: true, contracts: true, expenses: false, ...settings });
  const toggle = (k) => setLocal((p) => ({ ...p, [k]: !p[k] }));
  const onSave = () => { dispatch(saveNotifSettings(local)); toast.success('Preferences saved!'); };

  return (
    <SettingsCard title="Notification Preferences" subtitle="Choose what alerts you want to receive">
      <div className="space-y-1">
        <Toggle checked={local.maintenance} onChange={() => toggle('maintenance')} label="Maintenance Reminders"    description="Upcoming scheduled maintenance tasks" />
        <Toggle checked={local.repairs}     onChange={() => toggle('repairs')}     label="Repair Alerts"           description="Status changes on open repairs" />
        <Toggle checked={local.warranties}  onChange={() => toggle('warranties')}  label="Warranty Expiry"         description="Alerts 90 and 30 days before expiry" />
        <Toggle checked={local.contracts}   onChange={() => toggle('contracts')}   label="Contract Renewals"       description="Service contracts due for renewal" />
        <Toggle checked={local.expenses}    onChange={() => toggle('expenses')}    label="Monthly Expense Summary" description="Monthly spending digest via email" />
      </div>
      <div className="flex justify-end pt-4">
        <Button variant="primary" icon={RiSaveLine} onClick={onSave}>Save Preferences</Button>
      </div>
    </SettingsCard>
  );
}

function SecurityTab() {
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm();
  return (
    <SettingsCard title="Security" subtitle="Manage your password and access settings">
      <form onSubmit={handleSubmit(() => { setSaved(true); toast.success('Password updated!'); setTimeout(() => setSaved(false), 3000); })} className="space-y-5">
        <Field label="Current Password">
          <Input {...register('currentPassword')} type="password" placeholder="Enter current password" />
        </Field>
        <Field label="New Password">
          <Input {...register('newPassword')} type="password" placeholder="Minimum 8 characters" />
        </Field>
        <Field label="Confirm New Password">
          <Input {...register('confirmPassword')} type="password" placeholder="Repeat new password" />
        </Field>
        <div className="flex justify-end pt-2">
          <Button variant="primary" icon={saved ? RiShieldLine : RiSaveLine} type="submit">
            {saved ? 'Saved!' : 'Update Password'}
          </Button>
        </div>
      </form>
      <div className="mt-6 pt-6 border-t border-slate-100">
        <p className="text-[13px] font-bold text-slate-700 mb-3">Session</p>
        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-slate-700">Active session</p>
            <p className="text-[12px] text-slate-400">You are currently logged in on this device.</p>
          </div>
          <button className="text-[12px] font-bold text-danger-500 hover:text-danger-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-danger-50">Sign Out</button>
        </div>
      </div>
    </SettingsCard>
  );
}
