/**
 * Tathbeet Booking Engine — BookPro spec implementation
 * Handles availability generation, smart assignment, and policy enforcement
 */

import { supabase } from "@/integrations/supabase/client";
import { addMinutes, parse, format, isBefore, isAfter, differenceInHours } from "date-fns";

// ========== TYPES ==========

export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
  staffId: string;
}

export interface StaffRanking {
  staffId: string;
  displayName: string;
  score: number;
  availableSlots: number;
}

export interface BookingSettings {
  slot_interval_minutes: number;
  booking_window_days: number;
  advance_booking_notice_hours: number;
  cancellation_window_hours: number;
  reschedule_window_hours: number;
  max_reschedules: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  guest_booking_enabled: boolean;
  deposit_required: boolean;
  deposit_amount: number;
  smart_assignment_enabled: boolean;
  waitlist_enabled: boolean;
  walk_in_enabled: boolean;
}

const DEFAULT_SETTINGS: BookingSettings = {
  slot_interval_minutes: 30,
  booking_window_days: 30,
  advance_booking_notice_hours: 0,
  cancellation_window_hours: 24,
  reschedule_window_hours: 12,
  max_reschedules: 2,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  guest_booking_enabled: true,
  deposit_required: false,
  deposit_amount: 0,
  smart_assignment_enabled: false,
  waitlist_enabled: false,
  walk_in_enabled: false,
};

// ========== SETTINGS ==========

export async function fetchSettings(companyId: string): Promise<BookingSettings> {
  const { data } = await supabase
    .from("tathbeet_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...data };
}

// ========== AVAILABILITY ==========

export async function generateAvailableSlots(
  staffId: string,
  date: string,
  serviceDuration: number,
  companyId: string,
  slotInterval?: number,
  bufferBefore?: number,
  bufferAfter?: number,
  advanceNoticeHours?: number
): Promise<TimeSlot[]> {
  const settings = await fetchSettings(companyId);
  const interval = slotInterval ?? settings.slot_interval_minutes;
  const bBefore = bufferBefore ?? settings.buffer_before_minutes;
  const bAfter = bufferAfter ?? settings.buffer_after_minutes;
  const notice = advanceNoticeHours ?? settings.advance_booking_notice_hours;

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  const now = new Date();

  // Parallel fetch
  const [whRes, toRes, holRes, bdRes, bkRes] = await Promise.all([
    supabase.from("tathbeet_working_hours").select("*").eq("staff_profile_id", staffId).eq("day_of_week", dayOfWeek),
    supabase.from("tathbeet_time_off").select("*").eq("staff_profile_id", staffId).eq("date", date),
    supabase.from("tathbeet_holidays").select("*").eq("company_id", companyId).eq("date", date),
    supabase.from("tathbeet_blocked_dates").select("*").eq("company_id", companyId).eq("date", date).or(`staff_profile_id.eq.${staffId},staff_profile_id.is.null`),
    supabase.from("tathbeet_bookings").select("time_slot, duration_minutes, buffer_before_minutes, buffer_after_minutes, status")
      .eq("staff_profile_id", staffId).eq("booking_date", date)
      .not("status", "in", '("cancelled","no_show")'),
  ]);

  const workingHours = whRes.data?.[0];
  if (!workingHours || (toRes.data && toRes.data.length > 0) || (holRes.data && holRes.data.length > 0) || (bdRes.data && bdRes.data.length > 0)) {
    return [];
  }

  const wh = workingHours as any;
  const start = parse(wh.start_time, "HH:mm:ss", dateObj);
  const end = parse(wh.end_time, "HH:mm:ss", dateObj);
  const breakStart = wh.break_start ? parse(wh.break_start, "HH:mm:ss", dateObj) : null;
  const breakEnd = wh.break_end ? parse(wh.break_end, "HH:mm:ss", dateObj) : null;

  // Build booked ranges
  const bookedRanges = (bkRes.data || []).map((b: any) => {
    const bStart = addMinutes(parse(b.time_slot, "HH:mm:ss", dateObj), -(b.buffer_before_minutes || 0));
    const bEnd = addMinutes(parse(b.time_slot, "HH:mm:ss", dateObj), b.duration_minutes + (b.buffer_after_minutes || 0));
    return { start: bStart, end: bEnd };
  });

  const slots: TimeSlot[] = [];
  let current = start;
  const totalDuration = bBefore + serviceDuration + bAfter;

  while (isBefore(current, end) || format(current, "HH:mm") === format(end, "HH:mm")) {
    const slotEnd = addMinutes(current, totalDuration);
    if (isAfter(slotEnd, end)) break;

    const slotStr = format(current, "HH:mm");

    // Skip past slots + advance notice
    if (date === format(now, "yyyy-MM-dd")) {
      const minTime = addMinutes(now, notice * 60);
      if (isBefore(current, minTime)) {
        current = addMinutes(current, interval);
        continue;
      }
    }

    // Skip break overlap
    if (breakStart && breakEnd) {
      const slotWithBuffer = addMinutes(current, totalDuration);
      if (isBefore(current, breakEnd) && isAfter(slotWithBuffer, breakStart)) {
        current = addMinutes(current, interval);
        continue;
      }
    }

    // Check conflicts
    const slotRangeStart = addMinutes(current, -bBefore);
    const slotRangeEnd = addMinutes(current, serviceDuration + bAfter);
    const isConflict = bookedRanges.some(
      (r) => isBefore(slotRangeStart, r.end) && isAfter(slotRangeEnd, r.start)
    );

    slots.push({ time: slotStr, available: !isConflict, staffId });
    current = addMinutes(current, interval);
  }

  return slots.filter((s) => s.available);
}

// ========== SMART ASSIGNMENT ==========

export async function rankStaffForService(
  companyId: string,
  serviceId: string,
  date: string,
  customerId?: string
): Promise<StaffRanking[]> {
  // Get staff who can do this service
  const { data: staffServices } = await supabase
    .from("tathbeet_staff_services")
    .select("staff_profile_id")
    .eq("service_id", serviceId);

  let staffIds = staffServices?.map((s: any) => s.staff_profile_id) || [];

  // If no mapping, get all active staff
  if (staffIds.length === 0) {
    const { data: allStaff } = await supabase
      .from("tathbeet_staff_profiles")
      .select("id")
      .eq("company_id", companyId)
      .eq("booking_enabled", true);
    staffIds = allStaff?.map((s: any) => s.id) || [];
  }

  const { data: service } = await supabase
    .from("tathbeet_services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();

  const duration = service?.duration_minutes || 30;

  // Get customer preference
  let preferredStaffId: string | null = null;
  if (customerId) {
    const { data: pref } = await supabase
      .from("tathbeet_customer_preferences")
      .select("preferred_staff_id")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .maybeSingle();
    preferredStaffId = pref?.preferred_staff_id || null;
  }

  const rankings: StaffRanking[] = [];

  for (const sid of staffIds) {
    const slots = await generateAvailableSlots(sid, date, duration, companyId);
    const availCount = slots.length;

    // Get today's booking count for workload balance
    const { count } = await supabase
      .from("tathbeet_bookings")
      .select("id", { count: "exact", head: true })
      .eq("staff_profile_id", sid)
      .eq("booking_date", date)
      .not("status", "in", '("cancelled","no_show")');

    const bookingCount = count || 0;

    // Scoring
    let score = 0;
    score += Math.min(availCount * 5, 40); // Availability: 0-40
    score += Math.max(30 - bookingCount * 5, 0); // Workload: 0-30
    if (preferredStaffId === sid) score += 20; // Customer preference: 20
    score += 10; // Service specialization baseline

    const { data: profile } = await supabase
      .from("tathbeet_staff_profiles")
      .select("display_name, employees(name_ar)")
      .eq("id", sid)
      .single();

    rankings.push({
      staffId: sid,
      displayName: profile?.display_name || (profile as any)?.employees?.name_ar || "—",
      score,
      availableSlots: availCount,
    });
  }

  return rankings.sort((a, b) => b.score - a.score);
}

// ========== POLICY ENFORCEMENT ==========

export function canCancelBooking(
  bookingDate: string,
  bookingTime: string,
  cancellationWindowHours: number
): boolean {
  const bookingDateTime = parse(`${bookingDate} ${bookingTime}`, "yyyy-MM-dd HH:mm:ss", new Date());
  const hoursUntil = differenceInHours(bookingDateTime, new Date());
  return hoursUntil >= cancellationWindowHours;
}

export function canRescheduleBooking(
  bookingDate: string,
  bookingTime: string,
  rescheduleWindowHours: number,
  currentRescheduleCount: number,
  maxReschedules: number
): boolean {
  if (currentRescheduleCount >= maxReschedules) return false;
  const bookingDateTime = parse(`${bookingDate} ${bookingTime}`, "yyyy-MM-dd HH:mm:ss", new Date());
  const hoursUntil = differenceInHours(bookingDateTime, new Date());
  return hoursUntil >= rescheduleWindowHours;
}

export function isWithinBookingWindow(date: string, windowDays: number): boolean {
  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = addMinutes(today, windowDays * 24 * 60);
  return !isBefore(bookingDate, today) && isBefore(bookingDate, maxDate);
}

// ========== CURRENCY ==========

export function formatIQD(amount: number, lang: string = "ar"): string {
  if (lang === "ar") {
    return `${new Intl.NumberFormat("ar-IQ").format(amount)} د.ع`;
  }
  return `${new Intl.NumberFormat("en-IQ").format(amount)} IQD`;
}

export function formatIQDCompact(amount: number, lang: string = "ar"): string {
  if (amount >= 1_000_000) {
    const v = (amount / 1_000_000).toFixed(1);
    return lang === "ar" ? `${v}M د.ع` : `${v}M IQD`;
  }
  if (amount >= 1_000) {
    const v = (amount / 1_000).toFixed(0);
    return lang === "ar" ? `${v}K د.ع` : `${v}K IQD`;
  }
  return formatIQD(amount, lang);
}

// ========== CUSTOMER INTELLIGENCE ==========

export function calculateRiskScore(cancellations: number, noShows: number, totalBookings: number): number {
  if (totalBookings === 0) return 0;
  return Math.min((cancellations + noShows * 2) / totalBookings, 1.0);
}
