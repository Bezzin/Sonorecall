// FIX: Corrected the React import statement to properly import `useState` and `useEffect`.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Recall,
  RecallStatus,
  Conversation,
  Message,
  MessageSender,
  MissedCall,
  Patient,
  Appointment,
  MessageType,
  ClinicService,
  Product,
  AppointmentProduct,
  Bundle,
  BXGYRule,
  AppliedDiscount,
  CartBundle,
  UpsellRule,
  UpsellSuggestion,
  UpsellTracking,
  PaymentPlan,
  ScaledOffer,
  DownsellRule,
  DownsellSuggestion,
  DownsellTracking,
  DownsellTrigger,
  SelectedPaymentPlan,
  UpgradeCredit,
  AcceptedScaledOffer,
  DownsellCondition,
} from './types';
import {
  mockUpcomingAppointments,
  mockRecalls,
  mockConversations,
  analyticsData,
  mockMissedCalls,
  mockRecentAppointments,
  mockProducts,
  mockBundles,
  mockBXGYRules,
  mockUpsellRules,
  mockPaymentPlans,
  mockScaledOffers,
  mockDownsellRules,
  mockUpgradeCredits,
} from './constants';
import { geminiService } from './services/geminiService';
import { DashboardIcon, RecallIcon, CommsIcon, AnalyticsIcon, SettingsIcon, StarIcon, CalendarIcon, CheckCircleIcon, ErrorIcon, PhotoIcon, VideoIcon, SyncIcon, ProductIcon, GiftIcon } from './components/Icons';
import {
  saveProducts,
  loadProducts,
  saveAppointments,
  loadAppointments,
  saveBundles,
  loadBundles,
  saveBXGYRules,
  loadBXGYRules,
  saveUpsellRules,
  loadUpsellRules,
  savePaymentPlans,
  loadPaymentPlans,
  saveScaledOffers,
  loadScaledOffers,
  saveDownsellRules,
  loadDownsellRules,
  saveUpgradeCredits,
  loadUpgradeCredits,
} from './utils/storage';
import { evaluateUpsells, buildCartContext } from './utils/upsells';
import { evaluateDownsells, buildDownsellContext, calculatePaymentSchedule } from './utils/downsells';

type View = 'dashboard' | 'recalls' | 'communications' | 'analytics' | 'media-studio' | 'settings' | 'products' | 'bundles-promotions';
type NotificationType = { message: string; type: 'success' | 'error' };

const defaultServices: ClinicService[] = [
    { name: 'Follow-up Scan', price: '£90' },
    { name: 'Prenatal Scan (12wk)', price: '£120' },
    { name: 'Abdominal Scan', price: '£150' },
    { name: 'Musculoskeletal Scan', price: '£180' },
];

const formatCurrency = (value: number): string => `£${value.toFixed(2)}`;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [recalls, setRecalls] = useState<Recall[]>(mockRecalls);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(conversations.length > 0 ? conversations[0].id : null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>(mockRecentAppointments);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>(mockUpcomingAppointments);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>(mockMissedCalls);
  const [clinicServices, setClinicServices] = useState<ClinicService[]>(defaultServices);
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [bxgyRules, setBXGYRules] = useState<BXGYRule[]>([]);
  const [upsellRules, setUpsellRules] = useState<UpsellRule[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [scaledOffers, setScaledOffers] = useState<ScaledOffer[]>([]);
  const [downsellRules, setDownsellRules] = useState<DownsellRule[]>([]);
  const [upgradeCredits, setUpgradeCredits] = useState<UpgradeCredit[]>([]);

  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ appointmentId: number | null; patientName: string | null }>({ appointmentId: null, patientName: null });

  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingPatientName, setBookingPatientName] = useState<string | null>(null);

  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [notification, setNotification] = useState<NotificationType | null>(null);

  useEffect(() => {
    if (notification && notification.type === 'success') {
        const timer = setTimeout(() => {
            setNotification(null);
        }, 3000); // Hide success after 3 seconds
        return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedProducts = loadProducts(mockProducts);
    setProducts(loadedProducts);

    const loadedBundles = loadBundles(mockBundles);
    setBundles(loadedBundles);

    const loadedBXGYRules = loadBXGYRules(mockBXGYRules);
    setBXGYRules(loadedBXGYRules);

    const loadedUpsellRules = loadUpsellRules(mockUpsellRules);
    setUpsellRules(loadedUpsellRules);

    const loadedPaymentPlans = loadPaymentPlans(mockPaymentPlans);
    setPaymentPlans(loadedPaymentPlans);

    const loadedScaledOffers = loadScaledOffers(mockScaledOffers);
    setScaledOffers(loadedScaledOffers);

    const loadedDownsellRules = loadDownsellRules(mockDownsellRules);
    setDownsellRules(loadedDownsellRules);

    const loadedUpgradeCredits = loadUpgradeCredits(mockUpgradeCredits);
    setUpgradeCredits(loadedUpgradeCredits);

    const loadedAppointments = loadAppointments(mockUpcomingAppointments, mockRecentAppointments);
    setUpcomingAppointments(loadedAppointments.upcoming);
    setRecentAppointments(loadedAppointments.recent);
  }, []);

  // Save products to localStorage whenever they change
  useEffect(() => {
    if (products.length > 0) {
      saveProducts(products);
    }
  }, [products]);

  // Save bundles to localStorage whenever they change
  useEffect(() => {
    if (bundles.length > 0) {
      saveBundles(bundles);
    }
  }, [bundles]);

  // Save BXGY rules to localStorage whenever they change
  useEffect(() => {
    if (bxgyRules.length > 0) {
      saveBXGYRules(bxgyRules);
    }
  }, [bxgyRules]);

  // Save upsell rules to localStorage whenever they change
  useEffect(() => {
    if (upsellRules.length > 0) {
      saveUpsellRules(upsellRules);
    }
  }, [upsellRules]);

  useEffect(() => {
    if (paymentPlans.length > 0) {
      savePaymentPlans(paymentPlans);
    }
  }, [paymentPlans]);

  useEffect(() => {
    if (scaledOffers.length > 0) {
      saveScaledOffers(scaledOffers);
    }
  }, [scaledOffers]);

  useEffect(() => {
    if (downsellRules.length > 0) {
      saveDownsellRules(downsellRules);
    }
  }, [downsellRules]);

  useEffect(() => {
    saveUpgradeCredits(upgradeCredits);
  }, [upgradeCredits]);

  // Save appointments to localStorage whenever they change
  useEffect(() => {
    saveAppointments(upcomingAppointments, recentAppointments);
  }, [upcomingAppointments, recentAppointments]);


  const handleUpdateRecallStatus = (recallId: number, status: RecallStatus) => {
    setRecalls(prevRecalls =>
      prevRecalls.map(recall =>
        recall.id === recallId ? { ...recall, status: status } : recall
      )
    );
  };
  
  const handleContactPatient = (patient: Patient) => {
    let conversation = conversations.find(c => c.patientName === patient.name);
    
    if (!conversation) {
        const newConversation: Conversation = {
            id: Date.now(),
            patientName: patient.name,
            lastMessage: 'Recall message sent.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: false,
            messages: [
                {
                    id: Date.now(),
                    sender: MessageSender.System,
                    type: MessageType.Standard,
                    text: `Hi ${patient.name.split(' ')[0]}, this is SonoClinic. We noticed you are due for your follow-up scan. Please let us know when you would like to book.`,
                    timestamp: 'Just now'
                }
            ],
        };
        setConversations(prev => [newConversation, ...prev]);
        conversation = newConversation;
    }
    
    setSelectedConversationId(conversation.id);
    setCurrentView('communications');
  };

   const handleRecoverMissedCall = async (callId: number, callerNumber: string) => {
        try {
            const messageText = await geminiService.generateMissedCallResponse('SonoClinic', callerNumber);
            const patient = mockRecalls.map(r => r.patient).find(p => p.phone === callerNumber);
            const identifier = patient ? patient.name : callerNumber;
            let conversation = conversations.find(c => c.patientName === identifier || c.phoneNumber === callerNumber);
            const recoveryMessage: Message = { id: Date.now(), sender: MessageSender.System, type: MessageType.Standard, text: messageText, timestamp: 'Just now' };
            if (conversation) {
                setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, messages: [...c.messages, recoveryMessage], lastMessage: "Missed call recovery sent.", timestamp: 'Just now' } : c));
            } else {
                const newConversation: Conversation = { id: Date.now(), patientName: identifier, lastMessage: "Missed call recovery sent.", timestamp: 'Just now', messages: [recoveryMessage], phoneNumber: patient ? undefined : callerNumber, unread: false };
                setConversations(prev => [newConversation, ...prev]);
                conversation = newConversation;
            }
            setMissedCalls(prev => prev.map(call => call.id === callId ? { ...call, status: 'Contacted' } : call));
            setSelectedConversationId(conversation.id);
            setCurrentView('communications');
        } catch (error) {
            console.error("Gemini API call failed for missed call:", error);
            setNotification({ message: 'Failed to call the Gemini API. Please try again.', type: 'error' });
        }
    };
  
  const handleRequestReview = async (appointmentId: number, patientName: string) => {
      try {
        const messageText = await geminiService.generateReviewRequest('SonoClinic', patientName);
        let conversation = conversations.find(c => c.patientName === patientName);
        const feedbackMessage: Message = { id: Date.now(), sender: MessageSender.System, type: MessageType.FeedbackRequest, text: messageText, timestamp: 'Just now', payload: { appointmentId } };
        if (conversation) {
            setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, messages: [...c.messages, feedbackMessage], lastMessage: "Feedback request sent.", timestamp: 'Just now' } : c));
        } else {
            const newConversation: Conversation = { id: Date.now(), patientName, lastMessage: "Feedback request sent.", timestamp: 'Just now', messages: [feedbackMessage], unread: false };
            setConversations(prev => [newConversation, ...prev]);
            conversation = newConversation;
        }
        setRecentAppointments(prev => prev.map(app => app.id === appointmentId ? { ...app, reviewStatus: 'Requested' } : app));
        setSelectedConversationId(conversation.id);
        setCurrentView('communications');
      } catch(error) {
        console.error("Gemini API call failed for review request:", error);
        setNotification({ message: 'Failed to call the Gemini API. Please try again.', type: 'error' });
      }
  };
  
  const openFeedbackModal = (appointmentId: number, patientName: string) => {
      setFeedbackState({ appointmentId, patientName });
      setFeedbackModalOpen(true);
  };

  const handleFeedbackSubmit = (appointmentId: number, patientName: string, rating: number, feedbackText: string | null) => {
      const privateNote: Message = {
          id: Date.now(),
          sender: MessageSender.System,
          type: MessageType.PrivateNote,
          text: `Patient ${patientName} left ${rating}-star feedback for appointment #${appointmentId}.${feedbackText ? `\n\nFeedback: "${feedbackText}"` : ''}\n\nPlease follow up.`,
          timestamp: 'Just now'
      };
      setConversations(prev => prev.map(c => c.patientName === patientName ? { ...c, messages: [...c.messages, privateNote], lastMessage: "Private feedback received.", timestamp: "Just now" } : c));
      setRecentAppointments(prev => prev.map(app => app.id === appointmentId ? { ...app, reviewStatus: 'Completed' } : app));
      setFeedbackModalOpen(false);
  };

  const handleBookAppointment = (
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
      const originalTotal = bookingMeta?.originalTotal ?? price + productTotal;
      const finalTotal = bookingMeta?.finalTotal ?? price + productTotal;
      const totalSavingsValue = Math.max(originalTotal - finalTotal, 0);

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
        originalTotal,
        finalTotal,
        totalSavings: totalSavingsValue > 0 ? totalSavingsValue : undefined,
        appliedCredits: appliedCredits.length > 0 ? appliedCredits : undefined,
        issuedCredits: issuedCredits.length > 0 ? issuedCredits : undefined,
        scaledOffer: bookingMeta?.scaledOffer,
        status: 'Confirmed',
        reviewStatus: 'Pending',
      };

      setUpcomingAppointments(prev => [...prev, newAppointment].sort((a, b) => a.time.localeCompare(b.time)));

      // Deduct inventory for purchased products
      if (selectedProducts.length > 0) {
        setProducts(prevProducts => prevProducts.map(product => {
          const purchasedProduct = selectedProducts.find(p => p.id === product.id);
          if (purchasedProduct && product.trackStock) {
            return {
              ...product,
              stockLevel: product.stockLevel - purchasedProduct.quantity,
            };
          }
          return product;
        }));
      }

      if (appliedCredits.length > 0 || issuedCredits.length > 0) {
        setUpgradeCredits(prevCredits => {
          let updatedCredits = prevCredits.map(credit => {
            const applied = appliedCredits.find(c => c.id === credit.id);
            if (applied) {
              return {
                ...credit,
                redeemed: true,
                appliedAppointmentId: newAppointment.id,
              };
            }
            return credit;
          });

          const existingIds = new Set(updatedCredits.map(credit => credit.id));
          issuedCredits.forEach(credit => {
            if (!existingIds.has(credit.id)) {
              updatedCredits = [...updatedCredits, credit];
              existingIds.add(credit.id);
            }
          });

          return updatedCredits;
        });
      }

      const confirmationMessage: Message = { id: Date.now(), sender: MessageSender.System, type: MessageType.Standard, text: `Appointment Confirmed: ${newAppointment.type} on ${date.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })} at ${time}.`, timestamp: 'Just now' };
      setConversations(prev => prev.map(c => c.patientName === patientName ? { ...c, messages: [...c.messages, confirmationMessage], lastMessage: "Appointment confirmed.", timestamp: "Just now" } : c));

      // When an appointment is booked, update the status for any matching patient in the recall list.
      setRecalls(prevRecalls =>
        prevRecalls.map(recall =>
          recall.patient.name === patientName && (recall.status === RecallStatus.Due || recall.status === RecallStatus.Contacted)
            ? { ...recall, status: RecallStatus.Booked }
            : recall
        )
      );

      setBookingModalOpen(false);
      setNotification({ message: `Appointment for ${patientName} confirmed! (Total: £${finalTotal.toFixed(2)})`, type: 'success' });
  };
  
  const handleCompleteAppointment = (appointmentId: number) => {
    let appointmentToMove: Appointment | undefined;

    setUpcomingAppointments(prev => prev.filter(app => {
        if (app.id === appointmentId) {
            appointmentToMove = { ...app, status: 'Completed', time: 'Just now' };
            return false;
        }
        return true;
    }));

    if (appointmentToMove) {
        setRecentAppointments(prev => [appointmentToMove!, ...prev]);
        setNotification({ message: `Appointment for ${appointmentToMove!.patientName} marked as complete.`, type: 'success' });
    }
  };

  // Product Management Handlers
  const handleAddProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now(),
    };
    setProducts(prev => [...prev, newProduct]);
    setAddProductModalOpen(false);
    setNotification({ message: 'Product added successfully!', type: 'success' });
  };

  const handleEditProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setEditProductModalOpen(false);
    setEditingProduct(null);
    setNotification({ message: 'Product updated successfully!', type: 'success' });
  };

  const handleToggleProductStatus = (productId: number) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, active: !p.active } : p));
    setNotification({ message: 'Product status updated!', type: 'success' });
  };

  const handleUpdateProductStock = (productId: number, newStock: number) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stockLevel: newStock } : p));
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setEditProductModalOpen(true);
  };

  // Bundle Management Handlers
  const handleToggleBundleStatus = (bundleId: number) => {
    setBundles(prev => prev.map(b => b.id === bundleId ? { ...b, active: !b.active } : b));
    setNotification({ message: 'Bundle status updated!', type: 'success' });
  };

  // BXGY Rule Management Handlers
  const handleToggleBXGYRuleStatus = (ruleId: number) => {
    setBXGYRules(prev => prev.map(r => r.id === ruleId ? { ...r, active: !r.active } : r));
    setNotification({ message: 'Promotion rule status updated!', type: 'success' });
  };

  // Upsell Rule Management Handlers
  const handleToggleUpsellRuleStatus = (ruleId: number) => {
    setUpsellRules(prev => prev.map(r => r.id === ruleId ? { ...r, active: !r.active } : r));
    setNotification({ message: 'Upsell rule status updated!', type: 'success' });
  };

  // Downsell & retention management
  const handleToggleDownsellRuleStatus = (ruleId: number) => {
    setDownsellRules(prev => prev.map(r => r.id === ruleId ? { ...r, active: !r.active } : r));
    setNotification({ message: 'Downsell rule status updated!', type: 'success' });
  };

  const handleTogglePaymentPlanStatus = (planId: number) => {
    setPaymentPlans(prev => prev.map(plan => plan.id === planId ? { ...plan, active: !plan.active } : plan));
    setNotification({ message: 'Payment plan status updated!', type: 'success' });
  };

  const handleToggleScaledOfferStatus = (offerId: number) => {
    setScaledOffers(prev => prev.map(offer => offer.id === offerId ? { ...offer, active: !offer.active } : offer));
    setNotification({ message: 'Scaled offer status updated!', type: 'success' });
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView upcomingAppointments={upcomingAppointments} recentAppointments={recentAppointments} missedCalls={missedCalls} onRequestReview={handleRequestReview} onRecoverMissedCall={handleRecoverMissedCall} onCompleteAppointment={handleCompleteAppointment} />;
      case 'recalls':
        return <RecallsView recalls={recalls} onUpdateStatus={handleUpdateRecallStatus} onContactPatient={handleContactPatient} />;
      case 'communications':
        return <CommunicationsView conversations={conversations} setConversations={setConversations} selectedConversationId={selectedConversationId} setSelectedConversationId={setSelectedConversationId} onProvideFeedback={openFeedbackModal} onOpenBookingModal={(patientName) => { setBookingPatientName(patientName); setBookingModalOpen(true); }} />;
      case 'analytics':
        return <AnalyticsView appointments={[...upcomingAppointments, ...recentAppointments]} />;
      case 'media-studio':
        return <MediaStudioView setNotification={setNotification} />;
      case 'settings':
        return <SettingsView setNotification={setNotification} onSync={setClinicServices} />;
      case 'products':
        return <ProductsView products={products} onAddProduct={() => setAddProductModalOpen(true)} onEditProduct={openEditProductModal} onToggleStatus={handleToggleProductStatus} />;
      case 'bundles-promotions':
        return (
          <BundlesAndPromotionsView
            bundles={bundles}
            bxgyRules={bxgyRules}
            upsellRules={upsellRules}
            downsellRules={downsellRules}
            paymentPlans={paymentPlans}
            scaledOffers={scaledOffers}
            upgradeCredits={upgradeCredits}
            products={products}
            services={clinicServices}
            onToggleBundleStatus={handleToggleBundleStatus}
            onToggleRuleStatus={handleToggleBXGYRuleStatus}
            onToggleUpsellStatus={handleToggleUpsellRuleStatus}
            onToggleDownsellStatus={handleToggleDownsellRuleStatus}
            onTogglePaymentPlanStatus={handleTogglePaymentPlanStatus}
            onToggleScaledOfferStatus={handleToggleScaledOfferStatus}
          />
        );
      default:
        return <DashboardView upcomingAppointments={upcomingAppointments} recentAppointments={recentAppointments} missedCalls={missedCalls} onRequestReview={handleRequestReview} onRecoverMissedCall={handleRecoverMissedCall} onCompleteAppointment={handleCompleteAppointment} />;
    }
  };

  return (
    <>
      {notification && <Notification message={notification.message} type={notification.type} onClose={notification.type === 'error' ? () => setNotification(null) : undefined} />}
      <div className="flex h-screen bg-gray-100 font-sans">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header view={currentView} />
          <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
            {renderView()}
          </div>
        </main>
      </div>
      {isFeedbackModalOpen && feedbackState.appointmentId && feedbackState.patientName && ( <FeedbackModal patientName={feedbackState.patientName} appointmentId={feedbackState.appointmentId} onClose={() => setFeedbackModalOpen(false)} onSubmit={handleFeedbackSubmit} /> )}
      {isBookingModalOpen && bookingPatientName && (
        <BookingModal
          patientName={bookingPatientName}
          services={clinicServices}
          products={products}
          bundles={bundles}
          upsellRules={upsellRules}
          paymentPlans={paymentPlans}
          scaledOffers={scaledOffers}
          downsellRules={downsellRules}
          upgradeCredits={upgradeCredits}
          onClose={() => setBookingModalOpen(false)}
          onBook={handleBookAppointment}
        />
      )}
      {isAddProductModalOpen && ( <AddProductModal onClose={() => setAddProductModalOpen(false)} onAdd={handleAddProduct} /> )}
      {isEditProductModalOpen && editingProduct && ( <EditProductModal product={editingProduct} onClose={() => { setEditProductModalOpen(false); setEditingProduct(null); }} onSave={handleEditProduct} /> )}
    </>
  );
};

// Notification Component
const Notification: React.FC<{ message: string; type: 'success' | 'error'; onClose?: () => void; }> = ({ message, type, onClose }) => {
    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-500' : 'bg-red-600';
    const Icon = isSuccess ? CheckCircleIcon : ErrorIcon;
    return (
        <div className={`fixed top-5 right-5 ${bgColor} text-white px-5 py-3 rounded-lg shadow-lg flex items-center z-50 animate-fade-in-down`}>
            <Icon className="w-6 h-6" />
            <span className="ml-3 font-semibold">{message}</span>
            {onClose && (
                <button onClick={onClose} className="ml-4 -mr-2 p-1 rounded-full hover:bg-black/20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            )}
        </div>
    );
};

// Sidebar Component
const Sidebar: React.FC<{ currentView: View; setCurrentView: (view: View) => void }> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'recalls', label: 'Recalls', icon: <RecallIcon /> },
    { id: 'communications', label: 'Communications', icon: <CommsIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    { id: 'products', label: 'Products', icon: <ProductIcon /> },
    { id: 'bundles-promotions', label: 'Bundles & Promos', icon: <GiftIcon /> },
    { id: 'media-studio', label: 'Media Studio', icon: <PhotoIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <aside className="w-16 md:w-64 bg-white text-gray-800 flex flex-col transition-all duration-300">
      <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-gray-200">
        <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.28 15.28c-.18.18-.44.28-.71.28s-.53-.1-.71-.28l-3-3c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0l2.29 2.29 5.29-5.29c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-6 6z"/></svg>
        <span className="hidden md:inline ml-3 text-xl font-bold">SonoRecall</span>
      </div>
      <nav className="flex-1 mt-6">
        <ul>
          {navItems.map(item => (
            <li key={item.id} className="px-3">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setCurrentView(item.id as View); }}
                className={`flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
                  currentView === item.id ? 'bg-blue-100 text-blue-600 font-semibold' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {item.icon}
                <span className="hidden md:inline ml-4">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
       <div className="p-3 md:p-6 border-t border-gray-200">
          <div className="flex items-center">
            <img className="h-10 w-10 rounded-full object-cover" src="https://picsum.photos/100" alt="Admin avatar"/>
            <div className="hidden md:block ml-3">
              <p className="text-sm font-semibold">Dr. Evelyn Reed</p>
              <p className="text-xs text-gray-500">Clinic Manager</p>
            </div>
          </div>
        </div>
    </aside>
  );
};

// Header Component
const Header: React.FC<{ view: View }> = ({ view }) => {
  const title = view === 'media-studio' ? 'Media Studio' : view.charAt(0).toUpperCase() + view.slice(1);
  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200">
        + New Appointment
      </button>
    </header>
  );
};

// Dashboard View
interface DashboardViewProps {
    upcomingAppointments: Appointment[];
    recentAppointments: Appointment[];
    missedCalls: MissedCall[];
    onRequestReview: (appointmentId: number, patientName: string) => Promise<void>;
    onRecoverMissedCall: (callId: number, callerNumber: string) => Promise<void>;
    onCompleteAppointment: (appointmentId: number) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ upcomingAppointments, recentAppointments, missedCalls, onRequestReview, onRecoverMissedCall, onCompleteAppointment }) => {
  const [generating, setGenerating] = useState<number | string | null>(null);

  const handleMissedCallButtonClick = async (callId: number, callerNumber: string) => {
    setGenerating(`call-${callId}`);
    await onRecoverMissedCall(callId, callerNumber);
    setGenerating(null);
  };

  const handleReviewButtonClick = async (appointmentId: number, patientName: string) => {
    setGenerating(`review-${appointmentId}`);
    await onRequestReview(appointmentId, patientName);
    setGenerating(null);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard title="Retention Rate" value="82%" change="+5%" changeType="increase" />
        <DashboardCard title="No-Show Rate" value="5.2%" change="-1.5%" changeType="decrease" />
        <DashboardCard title="Bookings Recovered" value="28" change="+7" changeType="increase" />
        <DashboardCard title="Reviews Generated" value="15" change="+4" changeType="increase" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Appointments</h3>
            <div className="space-y-4">
              {upcomingAppointments.map(app => (
                <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center flex-1">
                    <img
                      src={`https://picsum.photos/seed/${app.patientName}/40`}
                      alt={app.patientName}
                      className="w-10 h-10 rounded-full mr-4"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-700">{app.patientName}</p>
                      <p className="text-sm text-gray-500">{app.type}</p>
                      {app.products && app.products.length > 0 && (
                        <div className="mt-1 text-xs text-gray-600">
                          <span className="font-semibold">Products:</span>{' '}
                          {app.products.map(p => `${p.name} (×${p.quantity})`).join(', ')}
                        </div>
                      )}
                      {app.price !== undefined && (
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          {formatCurrency(app.productTotal ? app.price + app.productTotal : app.price)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-gray-700">{app.time}</p>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          app.status === 'Confirmed'
                            ? 'bg-green-100 text-green-700'
                            : app.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : app.status === 'Completed'
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    <button
                      onClick={() => onCompleteAppointment(app.id)}
                      className="bg-gray-200 text-gray-700 font-semibold py-1 px-3 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      Mark Complete
                    </button>
                  </div>
                </div>
              ))}
              {upcomingAppointments.length === 0 && (
                <div className="text-center text-gray-500 py-6">No upcoming appointments scheduled.</div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Appointments</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Patient</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Time</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Review</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {recentAppointments.map(app => (
                    <tr key={app.id}>
                      <td className="px-4 py-3 text-gray-800">
                        <div className="font-semibold">{app.patientName}</div>
                        <div className="text-xs text-gray-500">{app.type}</div>
                        {app.products && app.products.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {app.products.map(p => `${p.name} (×${p.quantity})`).join(', ')}
                          </div>
                        )}
                        {app.price !== undefined && (
                          <div className="text-sm font-semibold text-blue-600 mt-1">{formatCurrency(app.price)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{app.time}</td>
                      <td className="px-4 py-3 text-gray-600">{app.status}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            app.reviewStatus === 'Pending'
                              ? 'bg-gray-200 text-gray-600'
                              : app.reviewStatus === 'Requested'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {app.reviewStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleReviewButtonClick(app.id, app.patientName)}
                          disabled={app.reviewStatus !== 'Pending' || generating === `review-${app.id}`}
                          className="bg-indigo-100 text-indigo-700 font-semibold py-1 px-3 rounded-lg hover:bg-indigo-200 transition-colors text-sm disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                          {generating === `review-${app.id}` ? '...' : 'Request Review'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Missed Call Recovery</h3>
            <div className="space-y-3">
              {missedCalls.map(call => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-700">{call.callerNumber}</p>
                    <p className="text-sm text-gray-500">{call.timestamp}</p>
                  </div>
                  <button
                    onClick={() => handleMissedCallButtonClick(call.id, call.callerNumber)}
                    disabled={call.status === 'Contacted' || generating === `call-${call.id}`}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${
                      call.status === 'Contacted'
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {generating === `call-${call.id}` ? '...' : call.status === 'Contacted' ? 'Contacted' : 'Recover'}
                  </button>
                </div>
              ))}
              {missedCalls.length === 0 && (
                <div className="text-center text-gray-500 py-6">No missed calls needing follow-up.</div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Recall Status</h3>
            <p className="text-sm text-gray-500">
              Track upcoming recalls and outreach progress from the Recalls view. Patients due soon will appear here once
              follow-ups are scheduled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
const DashboardCard: React.FC<{ title: string; value: string; change: string; changeType: 'increase' | 'decrease' }> = ({ title, value, change, changeType }) => {
  const isIncrease = changeType === 'increase';
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <p className="text-gray-500 font-medium">{title}</p>
      <div className="flex items-baseline space-x-2 mt-2">
        <p className="text-3xl font-bold text-gray-800">{value}</p>
        <span className={`flex items-center text-sm font-semibold ${isIncrease ? 'text-green-500' : 'text-red-500'}`}>
          {isIncrease ? '▲' : '▼'} {change}
        </span>
      </div>
    </div>
  );
};

// Recalls View
interface RecallsViewProps {
  recalls: Recall[];
  onUpdateStatus: (recallId: number, status: RecallStatus) => void;
  onContactPatient: (patient: Patient) => void;
}

const RecallsView: React.FC<RecallsViewProps> = ({ recalls, onUpdateStatus, onContactPatient }) => {
  const getStatusColor = (status: RecallStatus) => {
    switch (status) {
      case RecallStatus.Due: return 'bg-red-100 text-red-700';
      case RecallStatus.Contacted: return 'bg-yellow-100 text-yellow-700';
      case RecallStatus.Booked: return 'bg-green-100 text-green-700';
      case RecallStatus.Dismissed: return 'bg-gray-200 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Patient Recalls</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b-2 border-gray-200">
            <tr>
              <th className="p-3 text-sm font-semibold text-gray-600">Patient</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Contact</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Last Visit</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Next Due</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Status</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recalls.map(({ id, patient, status }) => (
              <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 font-medium text-gray-800">{patient.name}</td>
                <td className="p-3 text-gray-600">{patient.phone}</td>
                <td className="p-3 text-gray-600">{patient.lastVisit}</td>
                <td className="p-3 text-gray-600">{patient.nextDue}</td>
                <td className="p-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(status)}`}>{status}</span>
                </td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => {
                        onUpdateStatus(id, RecallStatus.Contacted);
                        onContactPatient(patient);
                    }}
                    disabled={status === RecallStatus.Contacted || status === RecallStatus.Booked || status === RecallStatus.Dismissed}
                    className="text-blue-600 hover:underline text-sm font-semibold disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed">
                    Contact
                  </button>
                  <button
                    onClick={() => onUpdateStatus(id, RecallStatus.Dismissed)}
                    disabled={status === RecallStatus.Dismissed}
                    className="text-gray-500 hover:underline text-sm font-semibold disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed">
                    Dismiss
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// Communications View
interface CommunicationsViewProps {
    conversations: Conversation[];
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
    selectedConversationId: number | null;
    setSelectedConversationId: (id: number | null) => void;
    onProvideFeedback: (appointmentId: number, patientName: string) => void;
    onOpenBookingModal: (patientName: string) => void;
}

const CommunicationsView: React.FC<CommunicationsViewProps> = ({ conversations, setConversations, selectedConversationId, setSelectedConversationId, onProvideFeedback, onOpenBookingModal }) => {
    const [newMessage, setNewMessage] = useState('');
    const selectedConversation = conversations.find(c => c.id === selectedConversationId);

    const handleSelectConversation = (convoId: number) => {
        setConversations(prevConvos =>
            prevConvos.map(c =>
                c.id === convoId ? { ...c, unread: false } : c
            )
        );
        setSelectedConversationId(convoId);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation) return;

        const message: Message = {
            id: Date.now(),
            sender: MessageSender.Clinic,
            type: MessageType.Standard,
            text: newMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
            lastMessage: newMessage,
            timestamp: message.timestamp,
        };
        
        setConversations(convos => convos.map(c => c.id === updatedConversation.id ? updatedConversation : c));
        setNewMessage('');
    };
    
    if (!selectedConversation) {
        return (
            <div className="flex h-[calc(100vh-10rem)] bg-white rounded-xl shadow-sm overflow-hidden items-center justify-center">
                <div className="text-center text-gray-500">
                    <CommsIcon />
                    <p className="mt-2">No conversation selected.</p>
                    <p className="text-sm">Select a conversation from the list or contact a patient from the Recalls page.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-10rem)] bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Conversation List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <input type="text" placeholder="Search conversations..." className="w-full px-3 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
                </div>
                <ul className="overflow-y-auto">
                    {conversations.map(convo => (
                        <li key={convo.id} onClick={() => handleSelectConversation(convo.id)} className={`p-4 cursor-pointer hover:bg-gray-50 border-l-4 ${selectedConversationId === convo.id ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}>
                           <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className={`font-semibold text-gray-800 truncate ${convo.unread ? 'font-bold' : ''}`}>{convo.patientName}</p>
                                        <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{convo.timestamp}</p>
                                    </div>
                                    <p className={`text-sm text-gray-500 truncate ${convo.unread ? 'font-bold text-gray-800' : ''}`}>{convo.lastMessage}</p>
                                </div>
                                {convo.unread && (
                                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full ml-3 mt-1 flex-shrink-0" aria-label="Unread message"></div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Message View */}
            <div className="w-2/3 flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center">
                   <img src={`https://picsum.photos/seed/${selectedConversation.patientName}/40`} alt={selectedConversation.patientName} className="w-10 h-10 rounded-full mr-3" />
                   <h3 className="text-lg font-semibold text-gray-800">{selectedConversation.patientName}</h3>
                </div>
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
                    {selectedConversation.messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === MessageSender.Clinic || msg.sender === MessageSender.System ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === MessageSender.Patient && <img src={`https://picsum.photos/seed/${selectedConversation.patientName}/32`} className="w-8 h-8 rounded-full" />}
                            <div className={`max-w-md p-3 rounded-xl ${
                                msg.sender === MessageSender.Clinic ? 'bg-blue-500 text-white rounded-br-none' :
                                msg.sender === MessageSender.Patient ? 'bg-gray-200 text-gray-800 rounded-bl-none' :
                                'bg-yellow-100 text-yellow-800 text-sm italic w-full text-center'
                            }`}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                {msg.type === MessageType.FeedbackRequest && (
                                     <button 
                                        onClick={() => onProvideFeedback(msg.payload.appointmentId, selectedConversation.patientName)}
                                        className="mt-2 w-full text-center bg-white text-blue-600 font-semibold py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        Provide Feedback
                                    </button>
                                )}
                                 {msg.type === MessageType.PrivateNote && (
                                    <div className="mt-2 text-xs font-semibold text-yellow-900">[PRIVATE NOTE FOR STAFF]</div>
                                )}
                                <p className={`text-xs mt-1 text-right ${msg.sender === MessageSender.Clinic ? 'text-blue-200' : 'text-gray-400'}`}>{msg.timestamp}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-gray-100">
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg">
                        <button 
                            type="button" 
                            onClick={() => onOpenBookingModal(selectedConversation.patientName)}
                            className="p-3 text-gray-500 hover:text-blue-600 transition-colors"
                            aria-label="Schedule Appointment"
                        >
                            <CalendarIcon />
                        </button>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full p-3 bg-transparent focus:outline-none text-gray-800"
                        />
                        <button type="submit" className="p-3 text-blue-500 hover:text-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Analytics View
const AnalyticsView: React.FC<{ appointments: Appointment[] }> = ({ appointments }) => {
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const revenueByPackage = useMemo(() => {
    const completedAppointments = appointments.filter(app => app.status === 'Completed' && app.price);
    const revenueMap = new Map<string, number>();

    completedAppointments.forEach(app => {
      const currentRevenue = revenueMap.get(app.type) || 0;
      revenueMap.set(app.type, currentRevenue + app.price!);
    });

    return Array.from(revenueMap.entries()).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">No-Show Rate Trend (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.noShowRate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recall Effectiveness</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.recallEffectiveness} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={60} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Revenue by Package</h3>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={revenueByPackage} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `£${value}`} />
                    <Legend />
                    <Bar dataKey="value" name="Revenue" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Patient Review Ratings</h3>
            <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                    <Pie
                        data={analyticsData.reviewRatings}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {analyticsData.reviewRatings.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Settings View
const SettingsView: React.FC<{ setNotification: (notification: NotificationType | null) => void; onSync: (services: ClinicService[]) => void; }> = ({ setNotification, onSync }) => {
    const [settings, setSettings] = useState({
        clinicName: 'SonoClinic Central London',
        contactPhone: '+44 20 7946 0123',
        clinicAddress: '123 Health St, London, W1 ABC',
        reminderHours: 24,
        enableTextBack: true,
    });
    const [clinicWebsite, setClinicWebsite] = useState('');
    const [syncedServices, setSyncedServices] = useState<ClinicService[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncAttempted, setSyncAttempted] = useState(false);

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value,
        }));
    };

    const handleSaveChanges = () => {
        setNotification({ message: 'Settings saved successfully!', type: 'success' });
        console.log('Saving settings:', settings);
    };
    
    const handleClinicSync = async () => {
        if (!clinicWebsite) {
            setNotification({ message: 'Please enter a clinic website URL.', type: 'error' });
            return;
        }
        setIsSyncing(true);
        setSyncAttempted(true);
        setNotification(null);
        try {
            const clinicInfo = await geminiService.syncClinicInfo(settings.clinicName, clinicWebsite);
            setSettings(prev => ({
                ...prev,
                contactPhone: clinicInfo.phone || prev.contactPhone,
                clinicAddress: clinicInfo.address || prev.clinicAddress,
            }));
            const services = clinicInfo.services || [];
            setSyncedServices(services);
            onSync(services);
            setNotification({ message: 'Clinic info synced successfully!', type: 'success' });
        } catch (error) {
            console.error(error);
            setNotification({ message: 'Failed to sync clinic info. Please try again.', type: 'error' });
            setSyncedServices([]);
            onSync([]);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">Clinic Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Clinic Name</label>
                        <input type="text" name="clinicName" value={settings.clinicName} onChange={handleSettingsChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Clinic Website URL</label>
                        <input 
                            type="url" 
                            name="clinicWebsite" 
                            value={clinicWebsite} 
                            onChange={(e) => setClinicWebsite(e.target.value)} 
                            placeholder="https://www.yourclinic.com"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Contact Phone</label>
                        <input type="text" name="contactPhone" value={settings.contactPhone} onChange={handleSettingsChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Clinic Address</label>
                        <input type="text" name="clinicAddress" value={settings.clinicAddress} onChange={handleSettingsChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
                    </div>
                </div>
                 <div className="mt-6 border-t pt-6 flex justify-end">
                    <button onClick={handleClinicSync} disabled={isSyncing || !clinicWebsite} className="flex items-center gap-2 bg-indigo-100 text-indigo-700 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-200 transition-colors text-sm disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed">
                        {isSyncing ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                           <SyncIcon />
                        )}
                        {isSyncing ? 'Syncing...' : 'ClinicSync'}
                    </button>
                </div>
            </div>

            {syncAttempted && (
                <div className="bg-white p-8 rounded-xl shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">Synced Services & Packages</h3>
                    {syncedServices.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            {syncedServices.map((service, index) => (
                                <span key={index} className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1.5 rounded-full">
                                    {service.name} {service.price && `- ${service.price}`}
                                </span>
                            ))}
                        </div>
                    ) : (
                         <p className="text-gray-500 italic">
                            No specific services or packages with prices were identified on the website. The app will use the default services for booking.
                        </p>
                    )}
                </div>
            )}

            <div className="bg-white p-8 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">Notification Settings</h3>
                <div className="space-y-4">
                    <p className="font-semibold">Appointment Reminders</p>
                    <div className="flex items-center">
                        <input type="number" name="reminderHours" value={settings.reminderHours} onChange={handleSettingsChange} className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
                        <span className="ml-3 text-gray-600">hours before appointment (via SMS & Email)</span>
                    </div>
                    <p className="font-semibold pt-4">Missed Call Text-Back</p>
                    <div className="flex items-center">
                        <label className="flex items-center cursor-pointer">
                            <div className="relative">
                               <input type="checkbox" name="enableTextBack" checked={settings.enableTextBack} onChange={handleSettingsChange} className="sr-only peer" />
                               <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </div>
                           <span className="ml-3 text-gray-700 font-medium">Enable automatic text-back for missed calls</span>
                        </label>
                    </div>
                </div>
            </div>
             <div className="flex justify-end">
                <button onClick={handleSaveChanges} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200">
                    Save Changes
                </button>
            </div>
        </div>
    );
};

// Feedback Modal Component
interface FeedbackModalProps {
    patientName: string;
    appointmentId: number;
    onClose: () => void;
    onSubmit: (appointmentId: number, patientName: string, rating: number, feedbackText: string | null) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ patientName, appointmentId, onClose, onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [step, setStep] = useState(1);
    const [feedbackText, setFeedbackText] = useState("");

    const handleFinalSubmit = () => {
        onSubmit(appointmentId, patientName, rating, feedbackText);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Feedback for SonoClinic</h2>
                    <p className="text-gray-600 mt-2">Hi {patientName}, thank you for your visit!</p>
                </div>
                
                {step === 1 && (
                    <div className="mt-8 text-center">
                        <p className="font-semibold mb-4">How would you rate your experience?</p>
                        <div className="flex justify-center items-center space-x-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button key={star}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="focus:outline-none"
                                >
                                    <StarIcon className={`w-10 h-10 transition-colors ${ (hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-300' }`} />
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => { if(rating > 0) setStep(2) }}
                            disabled={rating === 0}
                            className="mt-8 w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
                
                {step === 2 && rating >= 4 && (
                     <div className="mt-8 text-center">
                        <h3 className="text-xl font-semibold text-green-600">Thank you for the positive feedback!</h3>
                        <p className="text-gray-600 mt-2">We're so glad you had a great experience. Public reviews help others find our clinic. Would you be willing to share your review on Google?</p>
                        <button className="mt-6 w-full bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-600 transition-colors">
                            Share on Google
                        </button>
                         <button onClick={onClose} className="mt-2 text-sm text-gray-500 hover:underline">No, thanks</button>
                    </div>
                )}

                {step === 2 && rating < 4 && (
                     <div className="mt-8 text-left">
                        <h3 className="text-xl font-semibold text-red-600">We're sorry to hear that.</h3>
                        <p className="text-gray-600 mt-2">Your feedback is important. Please let us know what we can do to improve. This will be sent privately to our clinic manager.</p>
                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Please share your thoughts..."
                            className="mt-4 w-full h-28 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                        />
                        <button onClick={handleFinalSubmit} className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">
                            Send Private Feedback
                        </button>
                     </div>
                )}

                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
};

// Booking Modal Component
interface BookingModalProps {
    patientName: string;
    services: ClinicService[];
    products: Product[];
    bundles: Bundle[];
    upsellRules: UpsellRule[];
    paymentPlans: PaymentPlan[];
    scaledOffers: ScaledOffer[];
    downsellRules: DownsellRule[];
    upgradeCredits: UpgradeCredit[];
    onClose: () => void;
    onBook: (
      patientName: string,
      date: Date,
      time: string,
      serviceType: string,
      price: number,
      products: AppointmentProduct[],
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
        bundles?: CartBundle[];
      }
    ) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  patientName,
  services,
  products,
  bundles,
  upsellRules,
  paymentPlans,
  scaledOffers,
  downsellRules,
  upgradeCredits,
  onClose,
  onBook,
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<string>(services.length > 0 ? JSON.stringify(services[0]) : '');
    const [selectedProducts, setSelectedProducts] = useState<Map<number, number>>(new Map()); // productId -> quantity
    const [selectedBundles, setSelectedBundles] = useState<number[]>([]); // bundle IDs

    // Upsell tracking
    const [shownUpsells, setShownUpsells] = useState<UpsellSuggestion[]>([]);
    const [acceptedUpsells, setAcceptedUpsells] = useState<UpsellSuggestion[]>([]);
    const [declinedUpsells, setDeclinedUpsells] = useState<UpsellSuggestion[]>([]);
    const [sessionTracker, setSessionTracker] = useState<Map<number, number>>(new Map()); // ruleId -> show count
    const [currentUpsells, setCurrentUpsells] = useState<UpsellSuggestion[]>([]); // Current suggestions to display

    // Downsell tracking
    const [shownDownsells, setShownDownsells] = useState<DownsellSuggestion[]>([]);
    const [acceptedDownsells, setAcceptedDownsells] = useState<DownsellSuggestion[]>([]);
    const [declinedDownsells, setDeclinedDownsells] = useState<DownsellSuggestion[]>([]);
    const [currentDownsell, setCurrentDownsell] = useState<DownsellSuggestion | null>(null);
    const [shownDownsellRuleIds, setShownDownsellRuleIds] = useState<number[]>([]);
    const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<SelectedPaymentPlan | null>(null);
    const [acceptedScaledOffer, setAcceptedScaledOffer] = useState<AcceptedScaledOffer | null>(null);
    const [creditsToIssue, setCreditsToIssue] = useState<UpgradeCredit[]>([]);
    const [creditsToApply, setCreditsToApply] = useState<UpgradeCredit[]>([]);
    const [hasTriggeredCartDownsell, setHasTriggeredCartDownsell] = useState(false);
    const [hasTriggeredHesitation, setHasTriggeredHesitation] = useState(false);

    const availableTimes = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "02:00 PM", "02:30 PM", "03:00 PM"];

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    const startDay = startOfMonth.getDay(); // 0 = Sunday

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) {
        calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    const handleMonthChange = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
        setSelectedDate(null);
        setSelectedTime(null);
    };
    
    const handleDateSelect = (day: Date) => {
        if (day.getTime() < new Date(new Date().setHours(0,0,0,0)).getTime()) return; // Disable past dates
        setSelectedDate(day);
        setSelectedTime(null);
    };

    // Filter products: only active and available
    const availableProducts = products.filter(p => {
        if (!p.active) return false;
        if (p.trackStock && p.stockLevel <= 0) return false;
        return true;
    });

    const handleProductQuantityChange = (productId: number, quantity: number) => {
        const newMap = new Map(selectedProducts);
        if (quantity <= 0) {
            newMap.delete(productId);
        } else {
            const product = products.find(p => p.id === productId);
            if (product && product.trackStock && quantity > product.stockLevel) {
                // Don't allow quantity to exceed stock
                return;
            }
            newMap.set(productId, quantity);
        }
        setSelectedProducts(newMap);
    };

    const recordDownsellShown = useCallback((suggestion: DownsellSuggestion) => {
        setShownDownsells(prev => [...prev, suggestion]);
        setShownDownsellRuleIds(prev => prev.includes(suggestion.ruleId) ? prev : [...prev, suggestion.ruleId]);
    }, []);

    const triggerDownsell = useCallback(
        (
            trigger: DownsellTrigger,
            options: { declinedItemType?: 'service' | 'product' | 'bundle' | 'upsell'; declinedItemId?: number; originalPrice?: number } = {}
        ): boolean => {
            if (currentDownsell) {
                return false;
            }

            const context = buildDownsellContext(
                cartSubtotal,
                options.declinedItemType,
                options.declinedItemId,
                declinedUpsells.length > 0
            );

            const suggestion = evaluateDownsells(
                downsellRules,
                context,
                trigger,
                paymentPlans,
                scaledOffers,
                new Set(shownDownsellRuleIds)
            );

            if (!suggestion) {
                return false;
            }

            const enrichedSuggestion: DownsellSuggestion = { ...suggestion };

            if (enrichedSuggestion.offerType === 'scaled_offer' && enrichedSuggestion.scaledOffer) {
                const basePrice = options.originalPrice ?? originalServicePrice;
                if (typeof basePrice === 'number') {
                    enrichedSuggestion.originalPrice = basePrice;
                    enrichedSuggestion.newPrice = enrichedSuggestion.scaledOffer.reducedPrice;
                    enrichedSuggestion.savings = Math.max(basePrice - enrichedSuggestion.scaledOffer.reducedPrice, 0);
                } else {
                    enrichedSuggestion.newPrice = enrichedSuggestion.scaledOffer.reducedPrice;
                }
            }

            recordDownsellShown(enrichedSuggestion);
            setCurrentDownsell(enrichedSuggestion);
            return true;
        },
        [
            currentDownsell,
            cartSubtotal,
            declinedUpsells,
            downsellRules,
            paymentPlans,
            scaledOffers,
            shownDownsellRuleIds,
            originalServicePrice,
            recordDownsellShown,
        ]
    );

    // Upsell handlers
    const handleAcceptUpsell = (upsell: UpsellSuggestion) => {
        // Add the upsell to accepted list
        setAcceptedUpsells(prev => [...prev, upsell]);

        // Add the item to cart
        if (upsell.itemType === 'product') {
            const newMap = new Map(selectedProducts);
            const currentQty = newMap.get(upsell.itemId) || 0;
            newMap.set(upsell.itemId, currentQty + 1);
            setSelectedProducts(newMap);
        } else if (upsell.itemType === 'bundle') {
            setSelectedBundles(prev => [...prev, upsell.itemId]);
        }

        // Remove from current suggestions
        setCurrentUpsells(prev => prev.filter(u => u.ruleId !== upsell.ruleId));
    };

    const handleDeclineUpsell = (upsell: UpsellSuggestion) => {
        // Add to declined list
        setDeclinedUpsells(prev => [...prev, upsell]);

        // Remove from current suggestions
        setCurrentUpsells(prev => prev.filter(u => u.ruleId !== upsell.ruleId));

        triggerDownsell('upsell_declined', {
            declinedItemType: upsell.itemType,
            declinedItemId: upsell.itemId,
            originalPrice: upsell.originalPrice,
        });
    };

    // Evaluate upsells when service or products change (after_service placement)
    React.useEffect(() => {
        if (!selectedService) return;

        const service = JSON.parse(selectedService) as ClinicService;
        const servicePrice = parseFloat((service.price || '0').replace(/[^0-9.]/g, ''));

        const context = buildCartContext(
            { id: 0, name: service.name, price: servicePrice },
            selectedProducts,
            selectedBundles,
            products
        );

        // Evaluate after_service upsells
        const suggestions = evaluateUpsells(
            upsellRules,
            context,
            'after_service',
            products,
            bundles,
            services,
            sessionTracker
        );

        // Filter out already accepted or declined
        const newSuggestions = suggestions.filter(s =>
            !acceptedUpsells.find(a => a.ruleId === s.ruleId) &&
            !declinedUpsells.find(d => d.ruleId === s.ruleId)
        );

        if (newSuggestions.length > 0) {
            // Update session tracker
            const newTracker = new Map(sessionTracker);
            newSuggestions.forEach(s => {
                const count = newTracker.get(s.ruleId) || 0;
                newTracker.set(s.ruleId, count + 1);
            });
            setSessionTracker(newTracker);

            // Add to shown list
            setShownUpsells(prev => [...prev, ...newSuggestions]);
            setCurrentUpsells(newSuggestions);
        }
    }, [selectedService, selectedProducts, selectedBundles]);

    const handleAcceptDownsell = () => {
        if (!currentDownsell) return;

        setAcceptedDownsells(prev => [...prev, currentDownsell]);

        if (currentDownsell.offerType === 'payment_plan' && currentDownsell.paymentPlan && currentDownsell.paymentSchedule) {
            setSelectedPaymentPlan({
                planId: currentDownsell.paymentPlan.id,
                planName: currentDownsell.paymentPlan.name,
                schedule: currentDownsell.paymentSchedule,
            });
        } else if (currentDownsell.offerType === 'scaled_offer' && currentDownsell.scaledOffer) {
            if (currentDownsell.scaledOffer.originalItemType === 'service') {
                const scaledService: ClinicService = {
                    name: currentDownsell.scaledOffer.name,
                    price: `£${currentDownsell.scaledOffer.reducedPrice.toFixed(2)}`,
                };
                setSelectedService(JSON.stringify(scaledService));
                setAcceptedScaledOffer({
                    scaledOfferId: currentDownsell.scaledOffer.id,
                    name: currentDownsell.scaledOffer.name,
                    description: currentDownsell.scaledOffer.description,
                    originalItemName: currentDownsell.scaledOffer.originalItemName,
                    removedFeatures: currentDownsell.scaledOffer.removedFeatures,
                    originalPrice: currentDownsell.originalPrice ?? originalServicePrice,
                    newPrice: currentDownsell.scaledOffer.reducedPrice,
                });
            }
        } else if (currentDownsell.offerType === 'trial_credit' && currentDownsell.trialCreditAmount) {
            const newCredit: UpgradeCredit = {
                id: Date.now(),
                patientName,
                amount: currentDownsell.trialCreditAmount,
                description: currentDownsell.trialCreditDescription,
                createdAt: new Date().toISOString(),
                redeemed: false,
                sourceRuleId: currentDownsell.ruleId,
            };
            setCreditsToIssue(prev => [...prev, newCredit]);
        }

        setCurrentDownsell(null);
    };

    const handleDeclineDownsell = () => {
        if (!currentDownsell) return;
        setDeclinedDownsells(prev => [...prev, currentDownsell]);
        setCurrentDownsell(null);
    };

    const handleRemovePaymentPlan = () => {
        setSelectedPaymentPlan(null);
    };

    React.useEffect(() => {
        if (!acceptedScaledOffer) return;
        if (!service || service.name !== acceptedScaledOffer.name) {
            setAcceptedScaledOffer(null);
        }
    }, [service, acceptedScaledOffer]);

    React.useEffect(() => {
        if (hasTriggeredCartDownsell || cartSubtotal <= 0) return;

        const eligibleRuleExists = downsellRules.some(rule =>
            rule.active &&
            rule.conditions.some(condition =>
                condition.triggerType === 'cart_value_threshold' &&
                (!condition.minCartValue || cartSubtotal >= condition.minCartValue)
            )
        );

        if (!eligibleRuleExists) return;

        if (triggerDownsell('cart_value_threshold')) {
            setHasTriggeredCartDownsell(true);
        }
    }, [cartSubtotal, downsellRules, hasTriggeredCartDownsell, triggerDownsell]);

    React.useEffect(() => {
        if (hasTriggeredHesitation || cartSubtotal <= 0 || selectedTime || currentDownsell) return;

        const eligibleRuleExists = downsellRules.some(rule =>
            rule.active &&
            rule.conditions.some(condition => condition.triggerType === 'checkout_hesitation')
        );

        if (!eligibleRuleExists) return;

        const timer = window.setTimeout(() => {
            if (triggerDownsell('checkout_hesitation')) {
                setHasTriggeredHesitation(true);
            }
        }, 15000);

        return () => window.clearTimeout(timer);
    }, [cartSubtotal, selectedTime, currentDownsell, hasTriggeredHesitation, downsellRules, triggerDownsell]);

    // Calculate totals
    const service: ClinicService | null = selectedService ? JSON.parse(selectedService) : null;
    const servicePrice = service ? parseFloat((service.price || '0').replace(/[^0-9.]/g, '')) : 0;

    const selectedProductsList: AppointmentProduct[] = Array.from(selectedProducts.entries())
        .map(([productId, quantity]) => {
            const product = products.find(p => p.id === productId);
            if (!product) return null;
            return {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity,
            };
        })
        .filter((p): p is AppointmentProduct => p !== null);

    const productTotal = selectedProductsList.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const cartSubtotal = servicePrice + productTotal;

    const availableCredits = React.useMemo(
        () => upgradeCredits.filter(credit => !credit.redeemed && credit.patientName === patientName),
        [upgradeCredits, patientName]
    );

    const qualifiesForUpgrade = React.useMemo(() => {
        if (!service) return false;
        const serviceName = service.name.toLowerCase();
        const isPackage = serviceName.includes('package') || serviceName.includes('bundle');
        return isPackage || selectedBundles.length > 0;
    }, [service, selectedBundles]);

    React.useEffect(() => {
        if (!qualifiesForUpgrade || cartSubtotal <= 0 || availableCredits.length === 0) {
            if (creditsToApply.length !== 0) {
                setCreditsToApply([]);
            }
            return;
        }

        const matches =
            creditsToApply.length === availableCredits.length &&
            creditsToApply.every(credit => availableCredits.some(c => c.id === credit.id));

        if (!matches) {
            setCreditsToApply(availableCredits);
        }
    }, [qualifiesForUpgrade, availableCredits, cartSubtotal, creditsToApply]);

    const creditsAppliedTotal = creditsToApply.reduce((sum, credit) => sum + credit.amount, 0);
    const creditsValueApplied = Math.min(creditsAppliedTotal, cartSubtotal);
    const subtotalAfterCredits = Math.max(cartSubtotal - creditsValueApplied, 0);

    React.useEffect(() => {
        if (!selectedPaymentPlan) return;

        const plan = paymentPlans.find(p => p.id === selectedPaymentPlan.planId && p.active);
        if (!plan) {
            setSelectedPaymentPlan(null);
            return;
        }

        if (plan.minCartValue && subtotalAfterCredits < plan.minCartValue) {
            setSelectedPaymentPlan(null);
            return;
        }

        const updatedSchedule = calculatePaymentSchedule(plan, subtotalAfterCredits);
        if (
            Math.abs(updatedSchedule.totalAmount - selectedPaymentPlan.schedule.totalAmount) > 0.01 ||
            Math.abs(updatedSchedule.dueToday - selectedPaymentPlan.schedule.dueToday) > 0.01
        ) {
            setSelectedPaymentPlan({
                planId: plan.id,
                planName: plan.name,
                schedule: updatedSchedule,
            });
        }
    }, [selectedPaymentPlan, paymentPlans, subtotalAfterCredits]);

    const paymentPlanSchedule = selectedPaymentPlan?.schedule;
    const finalTotal = paymentPlanSchedule ? paymentPlanSchedule.totalAmount : subtotalAfterCredits;
    const dueToday = paymentPlanSchedule ? paymentPlanSchedule.dueToday : finalTotal;
    const originalServicePrice = acceptedScaledOffer ? acceptedScaledOffer.originalPrice : servicePrice;
    const originalTotal = originalServicePrice + productTotal;
    const paymentPlanFee = paymentPlanSchedule ? Math.max(paymentPlanSchedule.totalAmount - subtotalAfterCredits, 0) : 0;
    const totalSavings = Math.max(originalTotal - finalTotal, 0);
    const scaledOfferSavings = acceptedScaledOffer ? Math.max(acceptedScaledOffer.originalPrice - acceptedScaledOffer.newPrice, 0) : 0;
    const issuedCreditTotal = creditsToIssue.reduce((sum, credit) => sum + credit.amount, 0);

    const handleBooking = () => {
        if (!selectedDate || !selectedTime || !selectedService || !service) return;

        const upsellTracking: UpsellTracking = {
            shown: shownUpsells,
            accepted: acceptedUpsells,
            declined: declinedUpsells,
        };

        const downsellTracking: DownsellTracking | undefined =
            shownDownsells.length > 0 || acceptedDownsells.length > 0 || declinedDownsells.length > 0
                ? { shown: shownDownsells, accepted: acceptedDownsells, declined: declinedDownsells }
                : undefined;

        const appliedCredits =
            creditsValueApplied > 0
                ? creditsToApply.map(credit => ({
                    ...credit,
                    redeemed: true,
                }))
                : undefined;

        const bookingMeta = {
            downsellTracking,
            paymentPlan: selectedPaymentPlan ?? undefined,
            finalTotal,
            originalTotal,
            scaledOffer: acceptedScaledOffer ?? undefined,
            appliedCredits,
            issuedCredits: creditsToIssue.length > 0 ? creditsToIssue : undefined,
        };

        onBook(
            patientName,
            selectedDate,
            selectedTime,
            service.name,
            servicePrice,
            selectedProductsList,
            productTotal,
            upsellTracking,
            bookingMeta
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl m-4 transform transition-all">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Schedule for {patientName}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="mb-6">
                    <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 mb-1">Select Service</label>
                    <select
                      id="service-select"
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    >
                      {services.map((service) => (
                        <option key={service.name} value={JSON.stringify(service)}>
                          {service.name} {service.price && `(${service.price})`}
                        </option>
                      ))}
                    </select>
                </div>

                <div className="flex gap-8">
                    {/* Calendar */}
                    <div className="w-1/2">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-gray-100">&lt;</button>
                            <h3 className="font-semibold text-lg">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                            <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-sm">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="font-semibold text-gray-500">{day}</div>)}
                            {calendarDays.map((day, index) => (
                                <div key={index} className="p-2">
                                    {day && (
                                        <button
                                            onClick={() => handleDateSelect(day)}
                                            disabled={day.getTime() < new Date(new Date().setHours(0,0,0,0)).getTime()}
                                            className={`w-8 h-8 rounded-full transition-colors ${
                                                day.getTime() === selectedDate?.getTime() ? 'bg-blue-600 text-white' :
                                                day.getTime() < new Date(new Date().setHours(0,0,0,0)).getTime() ? 'text-gray-300 cursor-not-allowed' :
                                                'hover:bg-blue-100'
                                            }`}
                                        >
                                            {day.getDate()}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Time Slots */}
                    <div className="w-1/2 border-l pl-8">
                        <h3 className="font-semibold text-lg mb-4">
                            {selectedDate ? `Available Times for ${selectedDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}` : "Select a date"}
                        </h3>
                        {selectedDate && (
                            <div className="grid grid-cols-2 gap-2">
                                {availableTimes.map(time => (
                                    <button 
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`p-2 rounded-lg text-center font-semibold ${
                                            selectedTime === time ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-blue-100'
                                        }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Product Selection */}
                {availableProducts.length > 0 && (
                    <div className="mt-6 border-t pt-6">
                        <h3 className="font-semibold text-lg mb-4 text-gray-800">Add Products (Optional)</h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {availableProducts.map(product => {
                                const quantity = selectedProducts.get(product.id) || 0;
                                return (
                                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800">{product.name}</p>
                                            <p className="text-sm text-gray-600">{product.description}</p>
                                            <p className="text-sm font-semibold text-blue-600 mt-1">£{product.price.toFixed(2)}</p>
                                            {product.trackStock && product.stockLevel <= product.reorderPoint && (
                                                <p className="text-xs text-yellow-700 mt-1">Only {product.stockLevel} left</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => handleProductQuantityChange(product.id, quantity - 1)}
                                                disabled={quantity === 0}
                                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 font-semibold"
                                            >
                                                −
                                            </button>
                                            <span className="w-8 text-center font-semibold">{quantity}</span>
                                            <button
                                                onClick={() => handleProductQuantityChange(product.id, quantity + 1)}
                                                disabled={product.trackStock && quantity >= product.stockLevel}
                                                className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500 font-semibold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Upsell Suggestions */}
                {currentUpsells.length > 0 && (
                    <div className="mt-6 border-t pt-6">
                        <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
                            <span className="text-blue-600">✨</span>
                            You might also like
                        </h3>
                        <div className="space-y-3">
                            {currentUpsells.map(upsell => (
                                <div key={upsell.ruleId} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-800">{upsell.headline}</h4>
                                                {upsell.badge && (
                                                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-600 text-white">
                                                        {upsell.badge}
                                                    </span>
                                                )}
                                            </div>
                                            {upsell.subheadline && (
                                                <p className="text-sm text-gray-600 mt-1">{upsell.subheadline}</p>
                                            )}
                                            <div className="mt-2 flex items-center gap-3">
                                                {upsell.savings && upsell.savings > 0 ? (
                                                    <>
                                                        <span className="text-lg font-bold text-green-600">£{upsell.finalPrice.toFixed(2)}</span>
                                                        <span className="text-sm text-gray-500 line-through">£{upsell.originalPrice.toFixed(2)}</span>
                                                        <span className="text-sm font-semibold text-green-600">Save £{upsell.savings.toFixed(2)}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-lg font-bold text-blue-600">£{upsell.finalPrice.toFixed(2)}</span>
                                                )}
                                                {upsell.incrementalPrice && (
                                                    <span className="text-sm text-gray-600 italic">Just £{upsell.incrementalPrice.toFixed(2)} more</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 ml-4">
                                            <button
                                                onClick={() => handleAcceptUpsell(upsell)}
                                                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                                            >
                                                Add to Cart
                                            </button>
                                            <button
                                                onClick={() => handleDeclineUpsell(upsell)}
                                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold text-sm"
                                            >
                                                No thanks
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Price Breakdown */}
                {currentDownsell && (
                    <div className="mt-6 border-t pt-6">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-indigo-800">{currentDownsell.headline}</h3>
                                    {currentDownsell.subheadline && (
                                        <p className="text-sm text-indigo-700 mt-1">{currentDownsell.subheadline}</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-3 space-y-3">
                                {currentDownsell.offerType === 'payment_plan' && currentDownsell.paymentPlan && currentDownsell.paymentSchedule && (
                                    <div className="bg-white rounded-lg p-4">
                                        <p className="text-sm text-gray-700">{currentDownsell.paymentPlan.description}</p>
                                        <div className="mt-3 flex justify-between">
                                            <span className="text-xs uppercase text-gray-500">Due today</span>
                                            <span className="text-sm font-semibold text-indigo-600">£{currentDownsell.paymentSchedule.dueToday.toFixed(2)}</span>
                                        </div>
                                        <ul className="mt-2 space-y-1 text-xs text-gray-600">
                                            {currentDownsell.paymentSchedule.installments.map((installment, index) => (
                                                <li key={`${installment.dueDate}-${index}`} className="flex justify-between">
                                                    <span>{installment.dueDate} ({installment.description})</span>
                                                    <span>£{installment.amount.toFixed(2)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {currentDownsell.paymentSchedule.processingFee && (
                                            <p className="mt-2 text-xs text-gray-500">
                                                Includes processing fee of £{currentDownsell.paymentSchedule.processingFee.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {currentDownsell.offerType === 'scaled_offer' && currentDownsell.scaledOffer && (
                                    <div className="bg-white rounded-lg p-4">
                                        <div className="flex justify-between items-baseline">
                                            <div>
                                                <p className="text-xs uppercase text-gray-500">New price</p>
                                                <p className="text-lg font-semibold text-indigo-600">£{(currentDownsell.newPrice ?? currentDownsell.scaledOffer.reducedPrice).toFixed(2)}</p>
                                            </div>
                                            {typeof currentDownsell.originalPrice === 'number' && (
                                                <div className="text-right">
                                                    <p className="text-xs uppercase text-gray-500">Was</p>
                                                    <p className="text-sm text-gray-500 line-through">£{currentDownsell.originalPrice.toFixed(2)}</p>
                                                    {typeof currentDownsell.savings === 'number' && currentDownsell.savings > 0 && (
                                                        <p className="text-xs font-semibold text-green-600">Save £{currentDownsell.savings.toFixed(2)}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {currentDownsell.scaledOffer.removedFeatures.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-xs uppercase text-gray-500 font-semibold">What's different?</p>
                                                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
                                                    {currentDownsell.scaledOffer.removedFeatures.map(feature => (
                                                        <li key={feature}>{feature}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {currentDownsell.offerType === 'trial_credit' && (
                                    <div className="bg-white rounded-lg p-4">
                                        <p className="text-sm text-gray-700">{currentDownsell.trialCreditDescription}</p>
                                        <p className="mt-2 text-lg font-semibold text-indigo-600">Credit: £{currentDownsell.trialCreditAmount?.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={handleAcceptDownsell}
                                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                                >
                                    Sounds good
                                </button>
                                <button
                                    onClick={handleDeclineDownsell}
                                    className="px-4 py-2 text-indigo-700 hover:text-indigo-900 font-semibold text-sm"
                                >
                                    No thanks
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedPaymentPlan && paymentPlanSchedule && (
                    <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-indigo-700">{selectedPaymentPlan.planName}</h3>
                            <p className="text-xs text-indigo-600 mt-1">Due today: £{paymentPlanSchedule.dueToday.toFixed(2)}</p>
                            <p className="text-xs text-indigo-600">Total over plan: £{paymentPlanSchedule.totalAmount.toFixed(2)}</p>
                        </div>
                        <button
                            onClick={handleRemovePaymentPlan}
                            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                        >
                            Remove plan
                        </button>
                    </div>
                )}

                {creditsValueApplied > 0 && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                        Applying £{creditsValueApplied.toFixed(2)} credit toward this booking.
                    </div>
                )}

                {issuedCreditTotal > 0 && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                        Issue £{issuedCreditTotal.toFixed(2)} credit for future upgrades once this booking is confirmed.
                    </div>
                )}

                {/* Price Breakdown */}
                <div className="mt-6 border-t pt-6 space-y-2">
                    <div className="flex justify-between text-gray-700">
                        <span>Service:</span>
                        <span className="font-semibold">£{servicePrice.toFixed(2)}</span>
                    </div>
                    {selectedProductsList.length > 0 && (
                        <div className="flex justify-between text-gray-700">
                            <span>Products:</span>
                            <span className="font-semibold">£{productTotal.toFixed(2)}</span>
                        </div>
                    )}
                    {scaledOfferSavings > 0 && (
                        <div className="flex justify-between text-sm text-green-700">
                            <span>Scaled offer savings</span>
                            <span>-£{scaledOfferSavings.toFixed(2)}</span>
                        </div>
                    )}
                    {creditsValueApplied > 0 && (
                        <div className="flex justify-between text-sm text-green-700">
                            <span>Credits applied</span>
                            <span>-£{creditsValueApplied.toFixed(2)}</span>
                        </div>
                    )}
                    {paymentPlanFee > 0 && (
                        <div className="flex justify-between text-sm text-indigo-600">
                            <span>Payment plan fee</span>
                            <span>+£{paymentPlanFee.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Original total</span>
                        <span className={totalSavings > 0 ? 'line-through' : ''}>£{originalTotal.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-800">
                        <span>{selectedPaymentPlan ? 'Total over plan' : 'Total due'}</span>
                        <span>£{finalTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Due today</span>
                        <span className="font-semibold text-gray-800">£{dueToday.toFixed(2)}</span>
                    </div>
                    {totalSavings > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Total savings</span>
                            <span>£{totalSavings.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleBooking}
                        disabled={!selectedDate || !selectedTime || !selectedService}
                        className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                    >
                        Book Appointment
                    </button>
                </div>
            </div>
        </div>
    );
};

// Media Studio View and Components
const MediaStudioView: React.FC<{ setNotification: (notification: NotificationType | null) => void; }> = ({ setNotification }) => {
    const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('image')}
                        className={`${
                            activeTab === 'image'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <PhotoIcon /> <span className="ml-2">Image Enhancer</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('video')}
                        className={`${
                            activeTab === 'video'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                       <VideoIcon /> <span className="ml-2">Create Keepsake Video</span>
                    </button>
                </nav>
            </div>
            <div className="pt-6">
                {activeTab === 'image' && <ImageEditorView setNotification={setNotification} />}
                {activeTab === 'video' && <VideoGeneratorView setNotification={setNotification} />}
            </div>
        </div>
    );
};


// Image Editor View
const ImageEditorView: React.FC<{ setNotification: (notification: NotificationType | null) => void; }> = ({ setNotification }) => {
    const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
    const [originalImageMimeType, setOriginalImageMimeType] = useState<string | null>(null);
    const [editedImageSrc, setEditedImageSrc] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const predefinedPrompts = [
      { label: 'Enhance Clarity', value: 'Enhance the clarity and sharpness of the image, making the baby\'s features clearer.' },
      { label: 'Soften Image', value: 'Smooth the image for a softer, more artistic and gentle appearance.' },
      { label: 'Sepia Tone', value: 'Apply a warm, sepia-toned filter to give the image a classic, vintage photograph feel.' },
      { label: 'Increase Contrast', value: 'Increase the contrast to make the baby\'s features more distinct and defined against the background.' },
      { label: 'Angelic Glow', value: 'Add a subtle, soft, angelic glow effect around the baby.' },
      { label: 'Sketch Effect', value: 'Convert the image into a high-contrast, artistic black and white sketch.' },
    ];

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setEditedImageSrc(null);
            setError(null);
            setPrompt('');
            const base64String = await fileToBase64(file);
            setOriginalImageSrc(base64String);
            setOriginalImageMimeType(file.type);
        } else {
            setError("Please upload a valid image file.");
            setOriginalImageSrc(null);
            setOriginalImageMimeType(null);
        }
    };

    const handleGenerate = async () => {
        if (!originalImageSrc || !prompt) {
            setError("Please upload an image and select an enhancement option.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setEditedImageSrc(null);

        try {
            const base64Data = originalImageSrc.split(',')[1];
            
            const result = await geminiService.editImageWithPrompt(base64Data, originalImageMimeType!, prompt);

            if (result) {
                setEditedImageSrc(`data:image/png;base64,${result}`);
            } else {
                setError("Failed to generate the edited image. The result was empty.");
            }
        } catch (e) {
            console.error(e);
            setError("An unexpected error occurred while editing the image.");
            setNotification({ message: 'Failed to call the Gemini API. Please try again.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {!originalImageSrc ? (
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-10 h-10 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-500">PNG, JPG, or GIF</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                </div> 
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-lg font-semibold text-gray-700 mb-2">Original Image</h4>
                        <img src={originalImageSrc} alt="Original Upload" className="rounded-lg shadow-md w-full object-contain" />
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-600 mb-2">Select an Enhancement</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {predefinedPrompts.map((p) => (
                                    <button
                                        key={p.label}
                                        onClick={() => setPrompt(p.value)}
                                        className={`p-3 border rounded-lg text-sm font-semibold text-left transition-colors ${
                                            prompt === p.value
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 flex gap-4">
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="flex-1 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Generating...
                                    </>
                                ) : 'Generate Edit'}
                            </button>
                             <label htmlFor="reupload-file" className="cursor-pointer bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                                Change Image
                                <input id="reupload-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>
                    <div>
                         <h4 className="text-lg font-semibold text-gray-700 mb-2">Edited Image</h4>
                         <div className="w-full h-[300px] lg:h-full bg-gray-100 rounded-lg shadow-inner flex items-center justify-center p-4">
                            {isLoading && (
                                <div className="text-center text-gray-500">
                                    <svg className="animate-spin mx-auto h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <p className="mt-4 font-semibold">Enhancing image...</p>
                                    <p className="text-sm">This may take a moment.</p>
                                </div>
                            )}
                            {error && <p className="text-red-500 font-semibold">{error}</p>}
                            {!isLoading && !error && editedImageSrc && (
                                 <img src={editedImageSrc} alt="Edited Result" className="rounded-lg shadow-md w-full h-full object-contain" />
                            )}
                            {!isLoading && !error && !editedImageSrc && (
                                <p className="text-gray-500">Your edited image will appear here.</p>
                            )}
                         </div>
                         {editedImageSrc && !isLoading && (
                            <a 
                                href={editedImageSrc} 
                                download="edited-scan.png"
                                className="mt-4 w-full block text-center bg-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Download Edited Image
                            </a>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Video Generator View
const SelectApiKeyView: React.FC<{ onKeySelected: () => void }> = ({ onKeySelected }) => {
    const handleSelect = async () => {
        try {
            await (window as any).aistudio.openSelectKey();
            onKeySelected();
        } catch (e) {
            console.error("Error opening API key selection:", e);
        }
    };
    return (
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800">API Key Required for Video Generation</h3>
            <p className="mt-2 text-gray-600">
                The Veo video generation model requires you to select your own API key.
                Please ensure your project has billing enabled.
            </p>
            <button
                onClick={handleSelect}
                className="mt-6 bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
                Select API Key
            </button>
            <p className="mt-4 text-xs text-gray-500">
                For more information, please see the{" "}
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    billing documentation
                </a>.
            </p>
        </div>
    );
};


const VideoGeneratorView: React.FC<{ setNotification: (notification: NotificationType | null) => void; }> = ({ setNotification }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string | null>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isKeyReady, setIsKeyReady] = useState(false);

    useEffect(() => {
        const checkKey = async () => {
            if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
                const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                setIsKeyReady(hasKey);
            }
        };
        checkKey();
    }, []);
    
    // Cleanup for object URLs
    useEffect(() => {
        return () => {
            if (videoSrc && videoSrc.startsWith('blob:')) {
                URL.revokeObjectURL(videoSrc);
            }
        };
    }, [videoSrc]);

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setVideoSrc(null);
            setError(null);
            const base64String = await fileToBase64(file);
            setImageSrc(base64String);
            setImageMimeType(file.type);
        } else {
            setError("Please upload a valid image file.");
            setImageSrc(null);
            setImageMimeType(null);
        }
    };

    const handleGenerate = async () => {
        if (!imageSrc) {
            setError("Please upload an image first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        if (videoSrc) {
            URL.revokeObjectURL(videoSrc);
        }
        setVideoSrc(null);

        try {
            const base64Data = imageSrc.split(',')[1];
            const videoUrl = await geminiService.generateVideoFromImage(base64Data, imageMimeType!, aspectRatio, prompt);
            
            // Fetch the video data and create a blob URL
            const response = await fetch(videoUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch video data: ${response.status} ${response.statusText}`);
            }
            const videoBlob = await response.blob();
            const objectUrl = URL.createObjectURL(videoBlob);
            setVideoSrc(objectUrl);

        } catch (e: any) {
            console.error(e);
            let localErrorMessage = "An unexpected error occurred while generating the video.";
            if (e.message) {
                if (e.message.includes("Requested entity was not found")) {
                    localErrorMessage = "Your API Key seems invalid. Please re-select a valid key.";
                    setIsKeyReady(false); 
                } else if(e.message.includes("response was empty")) {
                    localErrorMessage = "Failed to generate the video. The result was empty."
                } else {
                    localErrorMessage = e.message;
                }
            }
            setError(localErrorMessage);
            setNotification({ message: 'Failed to call the Gemini API. Please try again.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isKeyReady) {
        return <SelectApiKeyView onKeySelected={() => setIsKeyReady(true)} />;
    }
    
    return (
        <div>
            {!imageSrc ? (
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="video-dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-10 h-10 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload image</span> or drag and drop</p>
                            <p className="text-xs text-gray-500">PNG, JPG, or GIF</p>
                        </div>
                        <input id="video-dropzone-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                </div> 
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-lg font-semibold text-gray-700 mb-2">Source Image</h4>
                        <img src={imageSrc} alt="Original Upload" className="rounded-lg shadow-md w-full object-contain" />
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-600 mb-2">Aspect Ratio</label>
                            <div className="flex gap-2">
                                <button onClick={() => setAspectRatio('16:9')} className={`p-3 border rounded-lg text-sm font-semibold flex-1 ${aspectRatio === '16:9' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}>Landscape (16:9)</button>
                                <button onClick={() => setAspectRatio('9:16')} className={`p-3 border rounded-lg text-sm font-semibold flex-1 ${aspectRatio === '9:16' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}>Portrait (9:16)</button>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-600 mb-2">
                                Animation Prompt (Optional)
                            </label>
                            <input
                                id="prompt-input"
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., a gentle zoom in"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            />
                        </div>
                        <div className="mt-4 flex gap-4">
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="flex-1 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
                            >
                               {isLoading ? 'Generating...' : 'Generate Video'}
                            </button>
                             <label htmlFor="reupload-video-file" className="cursor-pointer bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                                Change Image
                                <input id="reupload-video-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>
                    <div>
                         <h4 className="text-lg font-semibold text-gray-700 mb-2">Generated Video</h4>
                         <div className={`w-full bg-gray-100 rounded-lg shadow-inner flex items-center justify-center p-4 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] mx-auto max-w-sm'}`}>
                            {isLoading && (
                                <div className="text-center text-gray-500">
                                    <svg className="animate-spin mx-auto h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <p className="mt-4 font-semibold">Creating your video...</p>
                                    <p className="text-sm">This can take a few minutes. ✨</p>
                                </div>
                            )}
                            {error && <p className="text-red-500 font-semibold text-center">{error}</p>}
                            {!isLoading && !error && videoSrc && (
                                 <video src={videoSrc} controls autoPlay loop className="w-full h-full object-contain" />
                            )}
                            {!isLoading && !error && !videoSrc && (
                                <p className="text-gray-500">Your video will appear here.</p>
                            )}
                         </div>
                         {videoSrc && !isLoading && (
                            <a 
                                href={videoSrc} 
                                download="keepsake-video.mp4"
                                className="mt-4 w-full block text-center bg-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Download Video
                            </a>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Products View
interface ProductsViewProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onToggleStatus: (productId: number) => void;
}

const ProductsView: React.FC<ProductsViewProps> = ({ products, onAddProduct, onEditProduct, onToggleStatus }) => {
  const getStockStatus = (product: Product) => {
    if (!product.trackStock) return { label: 'No Tracking', color: 'bg-gray-100 text-gray-700' };
    if (product.stockLevel === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    if (product.stockLevel <= product.reorderPoint) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  const activeProducts = products.filter(p => p.active);
  const inactiveProducts = products.filter(p => !p.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Product Inventory</h2>
          <p className="text-sm text-gray-600 mt-1">Manage merchandise and add-ons available for bookings</p>
        </div>
        <button
          onClick={onAddProduct}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <ProductIcon />
          <h3 className="mt-4 text-lg font-semibold text-gray-800">No products yet</h3>
          <p className="text-gray-600 mt-2">Get started by adding your first product</p>
          <button
            onClick={onAddProduct}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Add Your First Product
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Active Products ({activeProducts.length})</h3>
            </div>
            {activeProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active products</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Product</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Category</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Price</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Stock</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Status</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeProducts.map(product => {
                      const stockStatus = getStockStatus(product);
                      return (
                        <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <p className="font-semibold text-gray-800">{product.name}</p>
                              <p className="text-sm text-gray-600">{product.description}</p>
                            </div>
                          </td>
                          <td className="p-4 text-gray-700">{product.category}</td>
                          <td className="p-4 text-gray-800 font-semibold">£{product.price.toFixed(2)}</td>
                          <td className="p-4">
                            {product.trackStock ? (
                              <span className="text-gray-700">{product.stockLevel} units</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${stockStatus.color}`}>
                              {stockStatus.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onEditProduct(product)}
                                className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onToggleStatus(product.id)}
                                className="text-gray-600 hover:text-gray-800 font-semibold text-sm"
                              >
                                Deactivate
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {inactiveProducts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Inactive Products ({inactiveProducts.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Product</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Category</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Price</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveProducts.map(product => (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 opacity-60">
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-gray-800">{product.name}</p>
                            <p className="text-sm text-gray-600">{product.description}</p>
                          </div>
                        </td>
                        <td className="p-4 text-gray-700">{product.category}</td>
                        <td className="p-4 text-gray-800 font-semibold">£{product.price.toFixed(2)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onEditProduct(product)}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onToggleStatus(product.id)}
                              className="text-green-600 hover:text-green-800 font-semibold text-sm"
                            >
                              Activate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Add Product Modal
interface AddProductModalProps {
  onClose: () => void;
  onAdd: (product: Omit<Product, 'id'>) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stockLevel, setStockLevel] = useState('0');
  const [reorderPoint, setReorderPoint] = useState('0');
  const [trackStock, setTrackStock] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !price || parseFloat(price) < 0) {
      return;
    }

    onAdd({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category: category.trim() || 'Other',
      stockLevel: parseInt(stockLevel) || 0,
      reorderPoint: parseInt(reorderPoint) || 0,
      trackStock,
      active: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Add New Product</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Printed Scan Photos"
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the product"
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price (£) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Prints, Digital, Keepsakes"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="trackStock"
              checked={trackStock}
              onChange={(e) => setTrackStock(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="trackStock" className="text-sm font-semibold text-gray-700">
              Track inventory for this product
            </label>
          </div>

          {trackStock && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Stock Level</label>
                <input
                  type="number"
                  min="0"
                  value={stockLevel}
                  onChange={(e) => setStockLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reorder Point</label>
                <input
                  type="number"
                  min="0"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this level</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Product
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Product Modal
interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSave: (product: Product) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose, onSave }) => {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price.toString());
  const [category, setCategory] = useState(product.category);
  const [stockLevel, setStockLevel] = useState(product.stockLevel.toString());
  const [reorderPoint, setReorderPoint] = useState(product.reorderPoint.toString());
  const [trackStock, setTrackStock] = useState(product.trackStock);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !price || parseFloat(price) < 0) {
      return;
    }

    onSave({
      ...product,
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category: category.trim() || 'Other',
      stockLevel: parseInt(stockLevel) || 0,
      reorderPoint: parseInt(reorderPoint) || 0,
      trackStock,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Product</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price (£) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="editTrackStock"
              checked={trackStock}
              onChange={(e) => setTrackStock(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="editTrackStock" className="text-sm font-semibold text-gray-700">
              Track inventory for this product
            </label>
          </div>

          {trackStock && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Level</label>
                <input
                  type="number"
                  min="0"
                  value={stockLevel}
                  onChange={(e) => setStockLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reorder Point</label>
                <input
                  type="number"
                  min="0"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this level</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Bundles and Promotions View
interface BundlesAndPromotionsViewProps {
  bundles: Bundle[];
  bxgyRules: BXGYRule[];
  upsellRules: UpsellRule[];
  downsellRules: DownsellRule[];
  paymentPlans: PaymentPlan[];
  scaledOffers: ScaledOffer[];
  upgradeCredits: UpgradeCredit[];
  products: Product[];
  services: ClinicService[];
  onToggleBundleStatus: (bundleId: number) => void;
  onToggleRuleStatus: (ruleId: number) => void;
  onToggleUpsellStatus: (ruleId: number) => void;
  onToggleDownsellStatus: (ruleId: number) => void;
  onTogglePaymentPlanStatus: (planId: number) => void;
  onToggleScaledOfferStatus: (offerId: number) => void;
}

const BundlesAndPromotionsView: React.FC<BundlesAndPromotionsViewProps> = ({
  bundles,
  bxgyRules,
  upsellRules,
  downsellRules,
  paymentPlans,
  scaledOffers,
  upgradeCredits,
  products,
  services,
  onToggleBundleStatus,
  onToggleRuleStatus,
  onToggleUpsellStatus,
  onToggleDownsellStatus,
  onTogglePaymentPlanStatus,
  onToggleScaledOfferStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'bundles' | 'promotions' | 'upsells' | 'downsells' | 'paymentPlans' | 'scaledOffers' | 'credits'>('bundles');

  const calculateBundlePricePreview = (bundle: Bundle): { original: number; final: number; savings: number } => {
    let original = 0;

    bundle.items.forEach(item => {
      if (item.type === 'product') {
        const product = products.find(p => p.id === item.id);
        if (product) original += product.price * item.quantity;
      } else if (item.type === 'service') {
        const service = services.find(s => s.name === item.name);
        if (service) {
          const price = parseFloat(service.price.replace(/[^0-9.]/g, ''));
          original += price * item.quantity;
        }
      }
    });

    let final = original;
    if (bundle.finalPrice !== undefined) {
      final = bundle.finalPrice;
    } else if (bundle.discountType === 'percentage') {
      final = original * (1 - bundle.discountValue / 100);
    } else if (bundle.discountType === 'fixed') {
      final = Math.max(0, original - bundle.discountValue);
    }

    return { original, final, savings: original - final };
  };

  const describeDownsellCondition = (condition: DownsellCondition): string => {
    const parts: string[] = [];

    switch (condition.triggerType) {
      case 'upsell_declined':
        parts.push('Upsell declined');
        break;
      case 'checkout_hesitation':
        parts.push('Checkout hesitation');
        break;
      case 'cart_value_threshold':
        parts.push('Cart value threshold');
        break;
    }

    if (condition.minCartValue) {
      parts.push(`Min cart ${formatCurrency(condition.minCartValue)}`);
    }

    if (condition.declinedItemType) {
      parts.push(`Declined ${condition.declinedItemType}`);
    }

    if (condition.declinedItemId) {
      parts.push(`Item #${condition.declinedItemId}`);
    }

    return parts.join(' • ');
  };

  const activeBundles = bundles.filter(b => b.active);
  const inactiveBundles = bundles.filter(b => !b.active);
  const activeRules = bxgyRules.filter(r => r.active);
  const inactiveRules = bxgyRules.filter(r => !r.active);
  const activeUpsells = upsellRules.filter(u => u.active);
  const inactiveUpsells = upsellRules.filter(u => !u.active);
  const activeDownsells = downsellRules.filter(r => r.active);
  const inactiveDownsells = downsellRules.filter(r => !r.active);
  const activePaymentPlans = paymentPlans.filter(plan => plan.active);
  const inactivePaymentPlans = paymentPlans.filter(plan => !plan.active);
  const activeScaled = scaledOffers.filter(offer => offer.active);
  const inactiveScaled = scaledOffers.filter(offer => !offer.active);
  const pendingCredits = upgradeCredits.filter(credit => !credit.redeemed);
  const redeemedCredits = upgradeCredits.filter(credit => credit.redeemed);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Bundles & Promotions</h2>
        <p className="text-sm text-gray-600 mt-1">Manage product bundles and Buy X Get Y promotional rules</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('bundles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bundles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Bundles ({bundles.length})
          </button>
          <button
            onClick={() => setActiveTab('promotions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'promotions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Buy X Get Y Rules ({bxgyRules.length})
          </button>
          <button
            onClick={() => setActiveTab('upsells')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upsells'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upsell Rules ({upsellRules.length})
          </button>
          <button
            onClick={() => setActiveTab('downsells')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'downsells'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Downsell Rules ({downsellRules.length})
          </button>
          <button
            onClick={() => setActiveTab('paymentPlans')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'paymentPlans'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payment Plans ({paymentPlans.length})
          </button>
          <button
            onClick={() => setActiveTab('scaledOffers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scaledOffers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Scaled Offers ({scaledOffers.length})
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'credits'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upgrade Credits ({upgradeCredits.length})
          </button>
        </nav>
      </div>

      {/* Bundles Tab */}
      {activeTab === 'bundles' && (
        <div className="space-y-6">
          {/* Active Bundles */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Active Bundles ({activeBundles.length})</h3>
            </div>
            {activeBundles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active bundles</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeBundles.map(bundle => {
                  const pricing = calculateBundlePricePreview(bundle);
                  return (
                    <div key={bundle.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-semibold text-gray-800">{bundle.name}</h4>
                            {bundle.category && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                {bundle.category}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{bundle.description}</p>

                          {/* Bundle Items */}
                          <div className="mt-3 space-y-1">
                            <p className="text-xs font-semibold text-gray-700 uppercase">Includes:</p>
                            {bundle.items.map((item, idx) => (
                              <div key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                {item.quantity}× {item.name} ({item.type === 'service' ? 'Service' : 'Product'})
                              </div>
                            ))}
                          </div>

                          {/* Pricing */}
                          <div className="mt-4 flex items-center gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Original Price</p>
                              <p className="text-sm font-semibold text-gray-500 line-through">£{pricing.original.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Bundle Price</p>
                              <p className="text-lg font-bold text-green-600">£{pricing.final.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">You Save</p>
                              <p className="text-sm font-semibold text-green-600">£{pricing.savings.toFixed(2)} ({((pricing.savings / pricing.original) * 100).toFixed(0)}% off)</p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onToggleBundleStatus(bundle.id)}
                          className="ml-4 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                          Deactivate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inactive Bundles */}
          {inactiveBundles.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Inactive Bundles ({inactiveBundles.length})</h3>
              </div>
              <div className="divide-y divide-gray-100 opacity-60">
                {inactiveBundles.map(bundle => {
                  const pricing = calculateBundlePricePreview(bundle);
                  return (
                    <div key={bundle.id} className="p-6 hover:bg-gray-50 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{bundle.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{bundle.description}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Was: £{pricing.original.toFixed(2)} → £{pricing.final.toFixed(2)} (Save £{pricing.savings.toFixed(2)})
                        </p>
                      </div>
                      <button
                        onClick={() => onToggleBundleStatus(bundle.id)}
                        className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                      >
                        Activate
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BXGY Promotions Tab */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">
          {/* Active Rules */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Active Promotions ({activeRules.length})</h3>
            </div>
            {activeRules.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active promotion rules</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeRules.map(rule => (
                  <div key={rule.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-800">{rule.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{rule.description}</p>

                        {/* Rule Details */}
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Rule Type</p>
                            <p className="text-gray-700 mt-1">
                              {rule.ruleType === 'free_item' && 'Free Item'}
                              {rule.ruleType === 'percentage_discount' && `${rule.discountValue}% Discount`}
                              {rule.ruleType === 'fixed_discount' && `£${rule.discountValue} Off`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Applies To</p>
                            <p className="text-gray-700 mt-1">
                              {rule.targetType === 'same_item' && 'Same Item'}
                              {rule.targetType === 'specific_item' && 'Specific Item'}
                              {rule.targetType === 'category' && `${rule.getCategory || 'Category'}`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>When:</strong> Buy {rule.buyQuantity} {rule.buyItemType !== 'any' ? rule.buyItemType : 'item'}
                            {rule.buyCategory ? ` from ${rule.buyCategory}` : ''}
                            {rule.buyItemId ? ` (specific item)` : ''}
                          </p>
                          <p className="text-sm text-blue-800 mt-1">
                            <strong>Get:</strong> {rule.getQuantity} item
                            {rule.ruleType === 'free_item' && ' FREE'}
                            {rule.ruleType === 'percentage_discount' && ` at ${rule.discountValue}% off`}
                            {rule.ruleType === 'fixed_discount' && ` for £${rule.discountValue} off each`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleRuleStatus(rule.id)}
                        className="ml-4 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      >
                        Deactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inactive Rules */}
          {inactiveRules.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Inactive Promotions ({inactiveRules.length})</h3>
              </div>
              <div className="divide-y divide-gray-100 opacity-60">
                {inactiveRules.map(rule => (
                  <div key={rule.id} className="p-6 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">{rule.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    </div>
                    <button
                      onClick={() => onToggleRuleStatus(rule.id)}
                      className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                    >
                      Activate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upsells Tab */}
      {activeTab === 'upsells' && (
        <div className="space-y-6">
          {/* Active Upsells */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Active Upsell Rules ({activeUpsells.length})</h3>
            </div>
            {activeUpsells.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active upsell rules</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeUpsells.map(upsell => (
                  <div key={upsell.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-semibold text-gray-800">{upsell.name}</h4>
                          {upsell.badge && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                              {upsell.badge}
                            </span>
                          )}
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            Priority: {upsell.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{upsell.description}</p>

                        {/* Upsell Details */}
                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Offer Type</p>
                            <p className="text-gray-700 mt-1 capitalize">{upsell.offerType.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Offering</p>
                            <p className="text-gray-700 mt-1">
                              {upsell.offeredItemName} ({upsell.offeredItemType})
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Placement</p>
                            <p className="text-gray-700 mt-1 capitalize">
                              {upsell.placement.map(p => p.replace(/_/g, ' ')).join(', ')}
                            </p>
                          </div>
                        </div>

                        {/* Trigger Conditions */}
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs font-semibold text-purple-900 uppercase mb-2">Trigger Conditions:</p>
                          {upsell.conditions.map((condition, idx) => (
                            <div key={idx} className="text-sm text-purple-800">
                              {condition.triggerType === 'service_selected' && (
                                <span>• Service: {condition.serviceName || `ID ${condition.serviceId}`}</span>
                              )}
                              {condition.triggerType === 'product_selected' && (
                                <span>• Product: {condition.productId ? `ID ${condition.productId}` : 'Any product'}</span>
                              )}
                              {condition.triggerType === 'category_selected' && (
                                <span>• Category: {condition.productCategory}</span>
                              )}
                              {condition.triggerType === 'bundle_selected' && (
                                <span>• Bundle: {condition.bundleId ? `ID ${condition.bundleId}` : 'Any bundle'}</span>
                              )}
                              {condition.triggerType === 'cart_value' && (
                                <span>• Cart value ≥ £{condition.minCartValue}</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Pricing Display */}
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            <strong>Display:</strong> {upsell.headline}
                            {upsell.subheadline && ` - ${upsell.subheadline}`}
                          </p>
                          {(upsell.discountedPrice || upsell.discountPercentage || upsell.incrementalPrice) && (
                            <p className="text-sm text-green-800 mt-1">
                              <strong>Pricing:</strong>{' '}
                              {upsell.discountedPrice && `£${upsell.discountedPrice.toFixed(2)}`}
                              {upsell.discountPercentage && `${upsell.discountPercentage}% off`}
                              {upsell.incrementalPrice && `Just £${upsell.incrementalPrice.toFixed(2)} more`}
                            </p>
                          )}
                        </div>

                        {/* Rate Limiting */}
                        {(upsell.maxDisplaysPerSession || upsell.onlyShowOnce) && (
                          <div className="mt-2 text-xs text-gray-600">
                            {upsell.onlyShowOnce && '• Show only once per session'}
                            {upsell.maxDisplaysPerSession && ` • Max ${upsell.maxDisplaysPerSession} displays per session`}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => onToggleUpsellStatus(upsell.id)}
                        className="ml-4 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      >
                        Deactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inactive Upsells */}
          {inactiveUpsells.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Inactive Upsell Rules ({inactiveUpsells.length})</h3>
              </div>
              <div className="divide-y divide-gray-100 opacity-60">
                {inactiveUpsells.map(upsell => (
                  <div key={upsell.id} className="p-6 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">{upsell.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{upsell.description}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Offers: {upsell.offeredItemName} • Priority: {upsell.priority}
                      </p>
                    </div>
                    <button
                      onClick={() => onToggleUpsellStatus(upsell.id)}
                      className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                    >
                      Activate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export default App;
