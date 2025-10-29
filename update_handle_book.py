from pathlib import Path

path = Path('App.tsx')
content = path.read_text()
start_marker = "const handleBookAppointment = "
end_marker = "\n\n  const handleCompleteAppointment"
start = content.index(start_marker)
end = content.index(end_marker, start)
new_function = """const handleBookAppointment = (
    patientName: string,
    date: Date,
    time: string,
    serviceType: string,
    price: number,
    selectedProducts: AppointmentProduct[],
    productTotal: number,
    upsellTracking?: UpsellTracking,
    bookingMeta?: {
      downsellTracking?: DownsellTracking;
      paymentPlan?: SelectedPaymentPlan;
      finalTotal?: number;
      originalTotal?: number;
      scaledOffer?: AcceptedScaledOffer;
      appliedCredits?: UpgradeCredit[];
      issuedCredits?: UpgradeCredit[];
    }
  ) => {
      const appliedCredits = bookingMeta?.appliedCredits ?? [];
      const issuedCredits = bookingMeta?.issuedCredits ?? [];
      const newAppointment: Appointment = {
        id: Date.now(),
        patientName,
        time,
        type: serviceType,
        price,
        products: selectedProducts.length > 0 ? selectedProducts : undefined,
        productTotal: selectedProducts.length > 0 ? productTotal : undefined,
        upsellTracking,
        downsellTracking: bookingMeta?.downsellTracking,
        paymentPlan: bookingMeta?.paymentPlan,
        originalTotal: bookingMeta?.originalTotal ?? price + productTotal,
        finalTotal: bookingMeta?.finalTotal ?? price + productTotal,
        totalSavings: (
          bookingMeta?.originalTotal is not None and bookingMeta?.finalTotal is not None
        )
      }
"""
