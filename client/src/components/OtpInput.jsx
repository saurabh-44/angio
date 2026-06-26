import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// 6-digit single-character input row used by login OTP + reset OTP.
// - Auto-advances focus on type.
// - Backspace on empty cell jumps to previous cell.
// - Paste of full 6-digit value distributes across cells.
// - Reports as a single string to `onChange` (length 0–6).
export function OtpInput({ value = '', onChange, length = 6, disabled, autoFocus = true, glass = false }) {
  const refs = useRef([]);

  useEffect(() => {
    if (autoFocus && !disabled) refs.current[0]?.focus();
  }, [autoFocus, disabled]);

  function setDigit(idx, digit) {
    const arr = value.padEnd(length, ' ').split('');
    arr[idx] = digit;
    const next = arr.join('').replace(/\s/g, '');
    onChange?.(next.slice(0, length));
  }

  function handleChange(idx, e) {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigit(idx, '');
      return;
    }
    // Distribute multi-char paste fallback
    if (raw.length > 1) {
      const next = raw.slice(0, length - idx);
      const out =
        value.slice(0, idx) +
        next +
        value.slice(Math.min(idx + next.length, length));
      onChange?.(out.slice(0, length));
      const focusIdx = Math.min(idx + next.length, length - 1);
      refs.current[focusIdx]?.focus();
      return;
    }
    setDigit(idx, raw);
    if (idx < length - 1) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < length - 1) refs.current[idx + 1]?.focus();
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange?.(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  }

  return (
    <div
      className="flex gap-1.5 sm:gap-3 justify-between"
      role="group"
      aria-label={`${length}-digit verification code`}
      onPaste={handlePaste}
    >
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (refs.current[idx] = el)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={value[idx] ?? ''}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          className={cn(
            'h-12 w-10 rounded-xl text-center font-mono text-xl font-semibold transition-colors disabled:opacity-50 sm:h-16 sm:w-14 sm:text-2xl',
            glass
              ? 'auth-glass-input border border-white/40 bg-white/10 text-white caret-white focus:border-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [color-scheme:dark]'
              : 'border border-input bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        />
      ))}
    </div>
  );
}
