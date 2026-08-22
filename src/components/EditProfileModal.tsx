import { useState, type FormEvent } from "react";
import type { User } from "../types";
import { ApiError } from "../lib/api";
import Avatar from "./Avatar";
import Modal from "./Modal";

export default function EditProfileModal({
  open,
  user,
  onClose,
  onSave,
}: {
  open: boolean;
  user: User;
  onClose: () => void;
  onSave: (input: { name: string; handle: string; avatar: string }) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [avatar, setAvatar] = useState(user.avatar);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave({ name: name.trim(), handle: handle.trim(), avatar: avatar.trim() });
      onClose();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Your profile could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <Avatar user={{ ...user, name: name || user.name, avatar }} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800 dark:text-white">
              {name || "Your name"}
            </p>
            <p className="truncate text-sm text-slate-500">{handle || "@handle"}</p>
          </div>
        </div>

        <ProfileField label="Name" value={name} onChange={setName} minLength={2} maxLength={80} />
        <ProfileField
          label="Handle"
          value={handle}
          onChange={setHandle}
          minLength={2}
          maxLength={30}
          pattern="@?[a-zA-Z0-9_.]+"
          hint="Letters, numbers, dots, and underscores"
        />
        <ProfileField
          label="Avatar URL"
          value={avatar}
          onChange={setAvatar}
          type="url"
          placeholder="https://example.com/avatar.jpg"
          required={false}
          hint="Direct image uploads are coming next."
        />

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  required = true,
  minLength,
  maxLength,
  pattern,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      {hint && <span className="mt-1 block text-xs font-normal text-slate-400">{hint}</span>}
    </label>
  );
}
