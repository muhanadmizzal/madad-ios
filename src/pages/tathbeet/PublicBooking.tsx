import { useState } from "react";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MADAD_LOGO, MODULE_REGISTRY } from "@/lib/moduleConfig";
const tathbeetLogo = MODULE_REGISTRY.tathbeet.iconLogo;
import { CalendarCheck, CheckCircle2, Clock, User, ArrowLeft, ArrowRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMinutes, parse, isBefore } from "date-fns";
import { generateAvailableSlots } from "@/lib/tathbeet/bookingEngine";

/* ── Sub-components ── */
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className={`h-2 rounded-full transition-all ${s <= step ? "w-10 bg-primary" : "w-6 bg-muted"}`} />
      ))}
    </div>
  );
}

function ConfirmationView({ service, date, slot, lang, t }: any) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <Card className="max-w-md w-full border-border/50">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
          <h2 className="font-heading font-bold text-xl">{t("تم الحجز بنجاح!", "Booking Confirmed!")}</h2>
          <p className="text-muted-foreground text-sm">{t("سيتم التواصل معك لتأكيد الموعد.", "We'll contact you to confirm the appointment.")}</p>
          <div className="bg-muted/30 rounded-xl p-4 text-sm space-y-1 text-start">
            <p><strong>{t("الخدمة:", "Service:")}</strong> {service?.name}</p>
            <p><strong>{t("التاريخ:", "Date:")}</strong> {date}</p>
            <p><strong>{t("الوقت:", "Time:")}</strong> {slot}</p>
          </div>
          <img src={MADAD_LOGO} alt="MADAD" className="h-8 mx-auto opacity-40 mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicBooking() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { t, lang } = useLanguage();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // Fetch tenant settings
  const { data: tenantSettings } = useQuery({
    queryKey: ["public-tathbeet-settings", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_settings").select("*").eq("company_id", tenantId!).maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["public-tathbeet-services", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_services").select("*, tathbeet_service_categories(name, name_en)").eq("company_id", tenantId!).eq("status", "active").order("sort_order");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["public-tathbeet-staff", tenantId, selectedService?.id],
    queryFn: async () => {
      if (!selectedService) return [];
      const { data: staffServices } = await supabase.from("tathbeet_staff_services").select("staff_profile_id").eq("service_id", selectedService.id);
      if (!staffServices?.length) {
        const { data } = await supabase.from("tathbeet_staff_profiles").select("*, employees(name_ar, name_en)").eq("company_id", tenantId!).eq("booking_enabled", true).eq("is_visible", true);
        return data || [];
      }
      const ids = staffServices.map((ss: any) => ss.staff_profile_id);
      const { data } = await supabase.from("tathbeet_staff_profiles").select("*, employees(name_ar, name_en)").in("id", ids).eq("booking_enabled", true).eq("is_visible", true);
      return data || [];
    },
    enabled: !!tenantId && !!selectedService,
  });

  const { data: workingHours = [] } = useQuery({
    queryKey: ["public-tathbeet-hours", selectedStaff?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_working_hours").select("*").eq("staff_profile_id", selectedStaff!.id);
      return data || [];
    },
    enabled: !!selectedStaff,
  });

  const { data: timeOff = [] } = useQuery({
    queryKey: ["public-tathbeet-timeoff", selectedStaff?.id, selectedDate],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_time_off").select("*").eq("staff_profile_id", selectedStaff!.id).eq("date", selectedDate);
      return data || [];
    },
    enabled: !!selectedStaff && !!selectedDate,
  });

  const { data: existingBookings = [] } = useQuery({
    queryKey: ["public-tathbeet-existing", selectedStaff?.id, selectedDate],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_bookings").select("time_slot, duration_minutes, status")
        .eq("staff_profile_id", selectedStaff!.id).eq("booking_date", selectedDate)
        .not("status", "in", '("cancelled","no_show")');
      return data || [];
    },
    enabled: !!selectedStaff && !!selectedDate,
  });

  const generateSlots = () => {
    if (timeOff.length > 0) return [];
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();
    const hours = workingHours.find((wh: any) => wh.day_of_week === dayOfWeek);
    if (!hours) return [];

    const duration = selectedService?.duration_minutes || 30;
    const buffer = (tenantSettings?.buffer_before_minutes || 0) + (tenantSettings?.buffer_after_minutes || 0);
    const slots: string[] = [];
    let current = parse(hours.start_time, "HH:mm:ss", dateObj);
    const end = parse(hours.end_time, "HH:mm:ss", dateObj);
    const now = new Date();

    while (isBefore(addMinutes(current, duration), end) || format(addMinutes(current, duration), "HH:mm") === format(end, "HH:mm")) {
      const slotStr = format(current, "HH:mm");
      const slotEnd = addMinutes(current, duration);

      if (selectedDate === format(now, "yyyy-MM-dd") && isBefore(current, now)) {
        current = addMinutes(current, duration + buffer);
        continue;
      }

      const isBooked = existingBookings.some((eb: any) => {
        const ebStart = parse(eb.time_slot, "HH:mm:ss", dateObj);
        const ebEnd = addMinutes(ebStart, eb.duration_minutes);
        return isBefore(current, ebEnd) && isBefore(ebStart, slotEnd);
      });

      if (!isBooked) slots.push(slotStr);
      current = addMinutes(current, duration + buffer);
    }
    return slots;
  };

  const availableSlots = selectedStaff && selectedDate ? generateSlots() : [];

  const confirmBooking = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tathbeet_bookings").insert({
        company_id: tenantId!,
        service_id: selectedService.id,
        staff_profile_id: selectedStaff.id,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        booking_date: selectedDate,
        time_slot: selectedSlot + ":00",
        duration_minutes: selectedService.duration_minutes,
        source: "public",
        status: tenantSettings?.booking_confirmation_style === "auto" ? "confirmed" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => { setConfirmed(true); toast.success(t("تم حجزك بنجاح!", "Booking confirmed!")); },
    onError: () => toast.error(t("حدث خطأ", "An error occurred")),
  });

  if (confirmed) {
    return <ConfirmationView service={selectedService} date={selectedDate} slot={selectedSlot} lang={lang} t={t} />;
  }

  return (
    <div className="min-h-screen bg-background p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2 pt-6">
          <img src={tathbeetLogo} alt="Tathbeet" className="h-16 mx-auto object-contain" />
          <p className="text-xs" style={{ color: "hsl(var(--gold))" }}>{t("من مدد", "BY MADAD")}</p>
          <h1 className="font-heading font-bold text-xl">{t("احجز موعدك", "Book Your Appointment")}</h1>
        </div>

        <ProgressBar step={step} />

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-heading font-bold">{t("١. اختر الخدمة", "1. Select Service")}</h2>
            {services.map((s: any) => (
              <Card key={s.id} className={`border-border/50 cursor-pointer transition-all ${selectedService?.id === s.id ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => { setSelectedService(s); setStep(2); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{lang === "ar" ? s.name : (s.name_en || s.name)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />{s.duration_minutes} {t("دقيقة", "min")} — {new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ").format(s.price)} {s.currency}
                    </p>
                  </div>
                  <Arrow className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
            {services.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">{t("لا توجد خدمات متاحة حالياً", "No services available")}</p>}
          </div>
        )}

        {/* Step 2: Select Staff */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold">{t("٢. اختر الموظف", "2. Select Staff")}</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>{t("رجوع", "Back")}</Button>
            </div>
            {staff.map((s: any) => {
              const name = s.display_name || (lang === "ar" ? s.employees?.name_ar : s.employees?.name_en) || s.employees?.name_ar || "";
              return (
                <Card key={s.id} className={`border-border/50 cursor-pointer transition-all ${selectedStaff?.id === s.id ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => { setSelectedStaff(s); setStep(3); }}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                    <span className="font-medium text-sm">{name}</span>
                  </CardContent>
                </Card>
              );
            })}
            {staff.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">{t("لا يوجد موظفون متاحون لهذه الخدمة", "No staff available for this service")}</p>}
          </div>
        )}

        {/* Step 3: Select Date & Slot */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold">{t("٣. اختر الموعد", "3. Select Date & Time")}</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>{t("رجوع", "Back")}</Button>
            </div>
            <div>
              <Label>{t("التاريخ", "Date")}</Label>
              <Input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(""); }} min={format(new Date(), "yyyy-MM-dd")} />
            </div>
            {timeOff.length > 0 ? (
              <p className="text-center text-amber-500 text-sm py-4">{t("الموظف في إجازة في هذا اليوم", "Staff is off on this day")}</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">{t("لا توجد أوقات متاحة في هذا اليوم", "No available slots on this day")}</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <Button key={slot} variant={selectedSlot === slot ? "default" : "outline"} size="sm" onClick={() => { setSelectedSlot(slot); setStep(4); }} className="font-mono">
                    {slot}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Customer Info & Confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold">{t("٤. معلوماتك", "4. Your Info")}</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>{t("رجوع", "Back")}</Button>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 text-sm space-y-1">
              <p><strong>{t("الخدمة:", "Service:")}</strong> {lang === "ar" ? selectedService?.name : (selectedService?.name_en || selectedService?.name)}</p>
              <p><strong>{t("التاريخ:", "Date:")}</strong> {selectedDate}</p>
              <p><strong>{t("الوقت:", "Time:")}</strong> {selectedSlot}</p>
            </div>
            <div><Label>{t("الاسم الكامل", "Full Name")} *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
            <div><Label>{t("رقم الهاتف", "Phone Number")}</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
            <Button className="w-full" size="lg" disabled={!customerName || confirmBooking.isPending} onClick={() => confirmBooking.mutate()}>
              {confirmBooking.isPending ? t("جاري الحجز...", "Booking...") : t("تأكيد الحجز", "Confirm Booking")}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-4">
          {t("مدعوم بواسطة", "Powered by")} <span style={{ color: "hsl(var(--gold))" }}>MADAD</span>
        </p>
      </div>
    </div>
  );
}
