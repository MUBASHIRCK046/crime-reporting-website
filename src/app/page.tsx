"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  AlertTriangle, 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  Settings, 
  Users, 
  Radio, 
  Phone,
  Lock,
  MapPin,
  Clock,
  Compass,
  AlertOctagon,
  Eye,
  FileEdit,
  FolderLock,
  Download,
  Activity,
  Map,
  X,
  FileCheck,
  Bell,
  Globe,
  Award,
  TrendingUp,
  Cpu,
  Navigation,
  Languages,
  BookOpen,
  Rss,
  Play,
  UserCheck,
  AlertCircle,
  Building2,
  Mail
} from "lucide-react";
import { toast } from "sonner";

// ==============================================================================
// 1. DICTIONARY TRANSLATIONS FOR ENGLISH, MALAYALAM, HINDI
// ==============================================================================
const translations: Record<string, Record<string, string>> = {
  English: {
    brand: "Crime Assist",
    realTimeLabel: "Real-time Law Enforcement Platform",
    safetyPalm: "Safety in the",
    hands: "palm of your hands.",
    heroDesc: "A modern bridge between citizens and law enforcement. Report crimes, attach evidence, and trigger emergency SOS alerts instantly.",
    reportBtn: "Report an Incident",
    policeAccess: "Police Access",
    cmdTime: "POLICE COMMAND TIME",
    sysStatus: "SYSTEM: ONLINE",
    respNet: "RESPONSE NET: ACTIVE",
    satComm: "SATELLITE COMM LINK",
    satOnline: "SATELLITE LINK: ONLINE",
    satMetrics: "UNITS: CONNECTED | SIGNAL: STABLE",
    cmdCenterTitle: "COMMAND RESPONSE CENTER",
    cmdCenterSubtitle: "Tactical Security Dashboard",
    sysOnlineTag: "SYSTEM STATUS: ● ONLINE",
    actUnitsTag: "ACTIVE RESPONSE: 4 UNITS",
    cmdNetTag: "COMMAND NETWORK: SYNCHRONIZED",
    secTag: "SECURITY: 100% VERIFIED",
    radarScopeLabel: "RESPONSE LOCATION TRACKING",
    radarScopeSubtitle: "COORDINATE MONITOR SCOPE",
    radarSweepLabel: "Concentric scan sweep active. Click glowing blip points to intercept tracking logs.",
    activeAlerts: "EMERGENCY SIGNAL MONITOR",
    responseEvent: "01 RESPONSE EVENT",
    statusTracking: "STATUS: TRACKING",
    sosBeacon: "SOS Beacon: ACTIVE",
    assignedUnit: "Assigned: Response Unit 4B",
    incidentType: "Incident: Robbery Report",
    assignedOfficer: "Assigned Officer: Inspector Sharma Division 2",
    caseStatus: "Case Status: SECURED",
    livePatrolLabel: "LIVE PATROL OPERATIONS",
    patrolActiveUnits: "ACTIVE UNITS: ONLINE",
    patrolSystemMonitoring: "PATROL SYSTEM: MONITORING",
    patrolResponseReady: "RESPONSE MODE: READY",
    currentActivityLabel: "Current Activity",
    patrolUnit: "MCA Patrol Unit 2",
    patrolRoute: "Route: Synchronized",
    patrolMovement: "Movement: Tracked",
    routeMetricsLabel: "RESPONSE PERFORMANCE TRACKING",
    dispatchUnit: "DISPATCH: MCA Patrol Unit 2",
    routeStatus: "ROUTE STATUS: OPTIMIZED",
    movementSync: "MOVEMENT: SYNCHRONIZED",
    etaCalculating: "ETA: CALCULATING...",
    cyberCommandLabel: "POLICE CYBER DEFENSE CENTER",
    cyberSystemSecure: "SYSTEM: SECURE",
    cyberNetworkProtected: "NETWORK: PROTECTED",
    cyberThreatMonitor: "THREAT MONITOR: ACTIVE",
    cyberFirewallEnabled: "FIREWALL: ENABLED",
    cyberSecLevel: "SECURITY LEVEL: MAXIMUM",
    dispatchControlLabel: "EMERGENCY COMMUNICATION NETWORK",
    dispatchStatusConnected: "DISPATCH STATUS: CONNECTED",
    dispatchEmergencyChannel: "EMERGENCY CHANNEL: ACTIVE",
    dispatchUnitAvailable: "RESPONSE UNIT: AVAILABLE",
    dispatchNetworkType: "NETWORK TYPE: SECURE VHF TELEMETRY",
    privacyProtocolLabel: "CITIZEN IDENTITY PROTECTION",
    privacyStatusProtected: "PRIVACY STATUS: PROTECTED",
    privacyIdentityShield: "IDENTITY SHIELD: ACTIVE",
    privacyPersonalData: "PERSONAL DATA: SECURED",
    privacyIdentityMode: "IDENTITY MODE: MASKED",
    privacyCitizenId: "CITIZEN ID: CIT_SECURE_48291",
    privacySecurityMethod: "SECURITY METHOD: SHA-256 ANONYMIZATION",
    globalPulseLabel: "POLICE NETWORK PULSE",
    globalConnActive: "GLOBAL CONNECTION: ACTIVE",
    dispatchLinksOnline: "DISPATCH LINKS: ONLINE",
    fieldUnitsConnected: "FIELD UNITS: CONNECTED",
    investigationCycleLabel: "INVESTIGATION CYCLE",
    investigationCycleSubtitle: "Incident Lifecycle Stages",
    activePhaseLogger: "ACTIVE PHASE LOGGER",
    sosPanelTitle: "Emergency SOS Dispatch",
    sosPanelDesc: "Releases your current GPS coordinate to local law response desks immediately.",
    sosPanelSuccess: "Distress Signal Logged",
    reportDeskTitle: "SECURE REPORT DESK",
    selectCategory: "Select Crime Category",
    describeIncident: "Describe the Incident",
    uploadEvidence: "Upload Evidence Attachments",
    locateGrid: "Locate Coordinate on Grid",
    complaintSecured: "COMPLAINT SECURED"
  },
  മലയാളം: {
    brand: "ക്രൈം അസിസ്റ്റ്",
    realTimeLabel: "തത്സമയ നിയമപാലക പ്ലാറ്റ്‌ഫോം",
    safetyPalm: "സുരക്ഷ നിങ്ങളുടെ",
    hands: "കൈകളിൽ.",
    heroDesc: "പൗരന്മാരും നിയമപാലകരും തമ്മിലുള്ള ഒരു ആധുനിക പാലം. കുറ്റകൃത്യങ്ങൾ റിപ്പോർട്ട് ചെയ്യുക, തെളിവുകൾ അറ്റാച്ചുചെയ്യുക, അടിയന്തിര SOS അലേർട്ടുകൾ തൽക്ഷണം പ്രവർത്തനക്ഷമമാക്കുക.",
    reportBtn: "ഒരു സംഭവം റിപ്പോർട്ട് ചെയ്യുക",
    policeAccess: "പോലീസ് പ്രവേശനം",
    cmdTime: "പോലീസ് കമാൻഡ് സമയം",
    sysStatus: "സിസ്റ്റം: ഓൺലൈൻ",
    respNet: "റെസ്‌പോൺസ് നെറ്റ്: സജീവം",
    satComm: "സാറ്റലൈറ്റ് കമ്മ്യൂണിക്കേഷൻ ലിങ്ക്",
    satOnline: "സാറ്റലൈറ്റ് ലിങ്ക്: ഓൺലൈൻ",
    satMetrics: "യൂണിറ്റുകൾ: ബന്ധിപ്പിച്ചു | സിഗ്നൽ: സുസ്ഥിരമാണ്",
    cmdCenterTitle: "കമാൻഡ് റെസ്‌പോൺസ് സെന്റർ",
    cmdCenterSubtitle: "ടാക്റ്റിക്കൽ സെക്യൂരിറ്റി ഡാഷ്‌ബോർഡ്",
    sysOnlineTag: "സിസ്റ്റം നില: ● ഓൺലൈൻ",
    actUnitsTag: "സജീവ പ്രതികരണം: 4 യൂണിറ്റുകൾ",
    cmdNetTag: "കമാൻഡ് നെറ്റ്‌വർക്ക്: സമന്വയിപ്പിച്ചു",
    secTag: "സുരക്ഷ: 100% പരിശോധിച്ചു",
    radarScopeLabel: "റെസ്‌പോൺസ് ലൊക്കേഷൻ ട്രാക്കിംഗ്",
    radarScopeSubtitle: "കോർഡിനേറ്റ് മോണിറ്റർ സ്കോപ്പ്",
    radarSweepLabel: "കോൺസെൻട്രിക് സ്കാൻ സ്വീപ്പ് സജീവമാണ്. ലോഗുകൾ തടസ്സപ്പെടുത്താൻ തിളങ്ങുന്ന ബ്ലിപ്പ് പോയിന്റുകളിൽ ക്ലിക്ക് ചെയ്യുക.",
    activeAlerts: "അടിയന്തര സിഗ്നൽ മോണിറ്റർ",
    responseEvent: "01 പ്രതികരണ ഇവന്റ്",
    statusTracking: "നില: ട്രാക്കിംഗ്",
    sosBeacon: "SOS ബീക്കൺ: സജീവം",
    assignedUnit: "അനുവദിച്ചത്: റെസ്‌പോൺസ് യൂണിറ്റ് 4B",
    incidentType: "സംഭവം: മോഷണം റിപ്പോർട്ട്",
    assignedOfficer: "അധികാരി: ഇൻസ്പെക്ടർ ശർമ്മ ഡിവിഷൻ 2",
    caseStatus: "കേസ് നില: സുരക്ഷിതം",
    livePatrolLabel: "തത്സമയ പട്രോളിംഗ് പ്രവർത്തനങ്ങൾ",
    patrolActiveUnits: "സജീവ യൂണിറ്റുകൾ: ഓൺലൈൻ",
    patrolSystemMonitoring: "പട്രോൾ സിസ്റ്റം: നിരീക്ഷിക്കുന്നു",
    patrolResponseReady: "പ്രതികരണ മോഡ്: സജ്ജം",
    currentActivityLabel: "നിലവിലെ പ്രവർത്തനം",
    patrolUnit: "MCA പട്രോൾ യൂണിറ്റ് 2",
    patrolRoute: "റൂട്ട്: സമന്വയിപ്പിച്ചു",
    patrolMovement: "ചലനം: ട്രാക്ക് ചെയ്തു",
    routeMetricsLabel: "റെസ്‌പോൺസ് പെർഫോമൻസ് ട്രാക്കിംഗ്",
    dispatchUnit: "അയച്ചത്: MCA പട്രോൾ യൂണിറ്റ് 2",
    routeStatus: "റൂട്ട് നില: ഒപ്റ്റിമൈസ് ചെയ്തു",
    movementSync: "ചലനം: സമന്വയിപ്പിച്ചു",
    etaCalculating: "സമയം: കണക്കാക്കുന്നു...",
    cyberCommandLabel: "പോലീസ് സൈബർ ഡിഫൻസ് സെന്റർ",
    cyberSystemSecure: "സിസ്റ്റം: സുരക്ഷിതം",
    cyberNetworkProtected: "നെറ്റ്‌വർക്ക്: പരിരക്ഷിതം",
    cyberThreatMonitor: "ഭീഷണി മോണിറ്റർ: സജീവം",
    cyberFirewallEnabled: "ഫയർവാൾ: പ്രവർത്തനക്ഷമമാക്കി",
    cyberSecLevel: "സുരക്ഷ നില: പരമാവധി",
    dispatchControlLabel: "അടിയന്തര ആശയവിനിമയ ശൃംഖല",
    dispatchStatusConnected: "ഡിസ്പാച്ച് നില: ബന്ധിപ്പിച്ചു",
    dispatchEmergencyChannel: "അടിയന്തര ചാനൽ: സജീവം",
    dispatchUnitAvailable: "പ്രതികരണ യൂണിറ്റ്: ലഭ്യമാണ്",
    dispatchNetworkType: "നെറ്റ്‌വർക്ക് തരം: സുരക്ഷിത വിഎച്ച്എഫ് ടെലിമെട്രി",
    privacyProtocolLabel: "പൗരൻ ഐഡന്റിറ്റി പ്രൊട്ടക്ഷൻ",
    privacyStatusProtected: "സ്വകാര്യത നില: പരിരക്ഷിതം",
    privacyIdentityShield: "ഐഡന്റിറ്റി ഷീൽഡ്: സജീവം",
    privacyPersonalData: "വ്യക്തിഗത ഡാറ്റ: സുരക്ഷിതമാക്കി",
    privacyIdentityMode: "ഐഡന്റിറ്റി മോഡ്: മാസ്ക് ചെയ്തു",
    privacyCitizenId: "പൗരൻ ഐഡി: CIT_SECURE_48291",
    privacySecurityMethod: "സുരക്ഷാ രീതി: SHA-256 അജ്ഞാതവൽക്കരണം",
    globalPulseLabel: "പോലീസ് നെറ്റ്‌വർക്ക് പൾസ്",
    globalConnActive: "ആഗോള കണക്ഷൻ: സജീവം",
    dispatchLinksOnline: "ഡിസ്പാച്ച് ലിങ്കുകൾ: ഓൺലൈൻ",
    fieldUnitsConnected: "ഫീൽഡ് യൂണിറ്റുകൾ: ബന്ധിപ്പിച്ചു",
    investigationCycleLabel: "അന്വേഷണ ചക്രം",
    investigationCycleSubtitle: "സംഭവത്തിന്റെ ലൈഫ് സൈക്കിൾ ഘട്ടങ്ങൾ",
    activePhaseLogger: "സജീവ ഘട്ട ലോഗർ",
    sosPanelTitle: "അടിയന്തര SOS ഡിസ്പാച്ച്",
    sosPanelDesc: "നിങ്ങളുടെ നിലവിലെ ജിപിഎസ് കോർഡിനേറ്റ് ഉടനടി പ്രാദേശിക റെസ്‌പോൺസ് ഡെസ്കുകളിലേക്ക് അയയ്ക്കുന്നു.",
    sosPanelSuccess: "അടിയന്തര സന്ദേശം രേഖപ്പെടുത്തി",
    reportDeskTitle: "സുരക്ഷിത റിപ്പോർട്ട് ഡെസ്ക്",
    selectCategory: "കുറ്റകൃത്യ വിഭാഗം തിരഞ്ഞെടുക്കുക",
    describeIncident: "സംഭവം വിവരിക്കുക",
    uploadEvidence: "തെളിവുകൾ അറ്റാച്ചുചെയ്യുക",
    locateGrid: "ഗ്രിഡിൽ ലൊക്കേഷൻ അടയാളപ്പെടുത്തുക",
    complaintSecured: "പരാതി സുരക്ഷിതമാക്കി"
  },
  Hindi: {
    brand: "क्राइम असिस्ट",
    realTimeLabel: "वास्तविक समय कानून प्रवर्तन मंच",
    safetyPalm: "सुरक्षा आपके",
    hands: "हाथों में।",
    heroDesc: "नागरिकों और कानून प्रवर्तन के बीच एक आधुनिक सेतु। अपराधों की रिपोर्ट करें, सबूत संलग्न करें, और तुरंत आपातकालीन संकट अलर्ट ट्रिगर करें।",
    reportBtn: "एक घटना की रिपोर्ट करें",
    policeAccess: "पुलिस पहुंच",
    brandAdmin: "व्यवस्थापक कंसोल",
    cmdTime: "पुलिस कमांड समय",
    sysStatus: "सिस्टम: ऑनलाइन",
    respNet: "प्रतिक्रिया नेटवर्क: सक्रिय",
    satComm: "उपग्रह संचार लिंक",
    satOnline: "सैटेलाइट लिंक: ऑनलाइन",
    satMetrics: "इकाइयाँ: जुड़े हुए | सिग्नल: स्थिर",
    cmdCenterTitle: "कमांड रिस्पांस सेंटर",
    cmdCenterSubtitle: "सामरिक सुरक्षा डैशबोर्ड",
    sysOnlineTag: "सिस्टम स्थिति: ● ऑनलाइन",
    actUnitsTag: "सक्रिय प्रतिक्रिया: 4 इकाइयाँ",
    cmdNetTag: "कमांड नेटवर्क: सिंक्रनाइज़",
    secTag: "सुरक्षा: 100% सत्यापित",
    radarScopeLabel: "प्रतिक्रिया स्थान ट्रैकिंग",
    radarScopeSubtitle: "समन्वय मॉनिटर कार्यक्षेत्र",
    radarSweepLabel: "सकेंद्रित स्कैन स्वीप सक्रिय। ट्रैकिंग लॉग को रोकने के लिए चमकते ब्लिप बिंदुओं पर क्लिक करें।",
    activeAlerts: "आपातकालीन संकेत मॉनिटर",
    responseEvent: "01 प्रतिक्रिया घटना",
    statusTracking: "स्थिति: ट्रैकिंग",
    sosBeacon: "एसओएस बीकन: सक्रिय",
    assignedUnit: "सौंपा गया: प्रतिक्रिया इकाई 4B",
    incidentType: "घटना: डकैती की रिपोर्ट",
    assignedOfficer: "अधिकारी: इंस्पेक्टर शर्मा डिवीजन 2",
    caseStatus: "मामले की स्थिति: सुरक्षित",
    livePatrolLabel: "लाइव गश्ती संचालन",
    patrolActiveUnits: "सक्रिय इकाइयाँ: ऑनलाइन",
    patrolSystemMonitoring: "गश्ती प्रणाली: निगरानी",
    patrolResponseReady: "प्रतिक्रिया मोड: तैयार",
    currentActivityLabel: "वर्तमान गतिविधि",
    patrolUnit: "MCA गश्ती इकाई 2",
    patrolRoute: "मार्ग: सिंक्रनाइज़",
    patrolMovement: "आंदोलन: ट्रैक किया गया",
    routeMetricsLabel: "प्रतिक्रिया प्रदर्शन ट्रैकिंग",
    dispatchUnit: "भेजा गया: MCA गश्ती इकाई 2",
    routeStatus: "मार्ग की स्थिति: अनुकूलित",
    movementSync: "आंदोलन: सिंक्रनाइज़",
    etaCalculating: "आगमन समय: गणना जारी...",
    cyberCommandLabel: "पुलिस साइबर रक्षा केंद्र",
    cyberSystemSecure: "सिस्टम: सुरक्षित",
    cyberNetworkProtected: "नेटवर्क: सुरक्षित",
    cyberThreatMonitor: "खतरा मॉनिटर: सक्रिय",
    cyberFirewallEnabled: "फायरवॉल: सक्षम",
    cyberSecLevel: "सुरक्षा स्तर: अधिकतम",
    dispatchControlLabel: "आपातकालीन संचार नेटवर्क",
    dispatchStatusConnected: "प्रेषण स्थिति: जुड़ा हुआ",
    dispatchEmergencyChannel: "आपातकालीन चैनल: सक्रिय",
    dispatchUnitAvailable: "प्रतिक्रिया इकाई: उपलब्ध",
    dispatchNetworkType: "नेटवर्क प्रकार: सुरक्षित वीएचएफ टेलीमेट्री",
    privacyProtocolLabel: "नागरिक पहचान सुरक्षा",
    privacyStatusProtected: "गोपनीयता स्थिति: सुरक्षित",
    privacyIdentityShield: "पहचान शील्ड: सक्रिय",
    privacyPersonalData: "व्यक्तिगत डेटा: सुरक्षित",
    privacyIdentityMode: "पहचान मोड: नकाबपोश",
    privacyCitizenId: "नागरिक आईडी: CIT_SECURE_48291",
    privacySecurityMethod: "सुरक्षा विधि: SHA-256 अनामीकरण",
    globalPulseLabel: "पुलिस नेटवर्क पल्स",
    globalConnActive: "वैश्विक कनेक्शन: सक्रिय",
    dispatchLinksOnline: "प्रेषण लिंक: ऑनलाइन",
    fieldUnitsConnected: "क्षेत्रीय इकाइयाँ: जुड़े हुए",
    investigationCycleLabel: "जांच चक्र",
    investigationCycleSubtitle: "घटना जीवन चक्र चरण",
    activePhaseLogger: "सक्रिय चरण लॉगर",
    sosPanelTitle: "आपातकालीन एसओएस प्रेषण",
    sosPanelDesc: "आपके वर्तमान जीपीएस निर्देशांक को तुरंत स्थानीय प्रतिक्रिया डेस्क पर भेजता है।",
    sosPanelSuccess: "संकट संदेश दर्ज किया गया",
    reportDeskTitle: "सुरक्षित रिपोर्ट डेस्क",
    selectCategory: "अपराध श्रेणी चुनें",
    describeIncident: "घटना का वर्णन करें",
    uploadEvidence: "सबूत संलग्न करें",
    locateGrid: "ग्रिड पर स्थान चिह्नित करें",
    complaintSecured: "शिकायत सुरक्षित"
  }
};

// ==============================================================================
// CONFETTI EFFECT
// ==============================================================================
function ConfettiEffect() {
  const colors = ["#3B82F6", "#8B5CF6", "#EF4444", "#10B981", "#F59E0B"];
  const particles = Array.from({ length: 45 });
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((_, i) => {
        const color = colors[i % colors.length];
        const delay = Math.random() * 0.4;
        const duration = Math.random() * 1.5 + 1.5;
        const left = Math.random() * 100;
        
        return (
          <motion.div
            key={i}
            initial={{ y: -20, opacity: 1, scale: Math.random() * 0.6 + 0.4, x: Math.random() * 60 - 30 }}
            animate={{ 
              y: 500, 
              opacity: 0,
              rotate: Math.random() * 360,
              x: Math.random() * 160 - 80
            }}
            transition={{ duration, delay, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: `${left}%`,
              width: "8px",
              height: "8px",
              borderRadius: i % 2 === 0 ? "50%" : "2px",
              backgroundColor: color,
            }}
          />
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  // ==============================================================================
  // STATE MANAGEMENT
  // ==============================================================================
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedRadarBlip, setSelectedRadarBlip] = useState<any | null>(null);
  
  // Custom Live Activity Feed list (Radar points)
  const [radarPoints, setRadarPoints] = useState<any[]>([
    {
      id: "blip-1",
      label: "SOS beacon active",
      coordinates: "11.2594° N, 75.7830° E",
      type: "distress",
      time: "Just now",
      x: 35, // percentage coords on radar screen
      y: 40,
      details: {
        unit: "Responders Unit 4B",
        eta: "1m 30s",
        severity: "CRITICAL",
        citizen: "Aswani (Roll No 5)"
      }
    },
    {
      id: "blip-2",
      label: "Robbery report locked",
      coordinates: "11.2612° N, 75.7801° E",
      type: "robbery",
      time: "8 mins ago",
      x: 70,
      y: 25,
      details: {
        unit: "Inspector Sharma (Div 2)",
        evidence: "evidence_invoice_doc.pdf",
        status: "INVESTIGATING",
        citizen: "Verified Citizen Account"
      }
    },
    {
      id: "blip-3",
      label: "Incident closed",
      coordinates: "11.2505° N, 75.7910° E",
      type: "resolved",
      time: "1 hour ago",
      x: 55,
      y: 75,
      details: {
        unit: "MCA Patrol Team 1",
        resolution: "Stolen assets recovered. IPC 379 Booked.",
        status: "CLOSED",
        citizen: "Anonymous File Log"
      }
    }
  ]);

  // Interactive timeline progress steps
  const [timelineStep, setTimelineStep] = useState(2);
  const timelineNodes = [
    { title: "REPORT RECEIVED", desc: "Citizen submits telemetry logs and complaint files." },
    { title: "LOCATION VERIFIED", desc: "Automated GPS triangulators lock incident coordinates." },
    { title: "UNIT DISPATCHED", desc: "Regional command dispatches closest tactical responders." },
    { title: "RESPONSE ACTIVE", desc: "Active telemetry routing and suspect tracing ongoing." },
    { title: "CASE UPDATED", desc: "Suspects verified, assets logged, case successfully updated." }
  ];

  // Report incident wizard workflow states
  const [reportStep, setReportStep] = useState(1);
  const [reportCategory, setReportCategory] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [pinnedCoords, setPinnedCoords] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [generatedCaseId, setGeneratedCaseId] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  // Floating SOS Button Drawer states
  const [isSosPanelOpen, setIsSosPanelOpen] = useState(false);
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const [isHoldingSos, setIsHoldingSos] = useState(false);
  const [sosTimer, setSosTimer] = useState<any>(null);
  const [sosCountdown, setSosCountdown] = useState(3);
  const [sosDispatched, setSosDispatched] = useState(false);
  const [dispatchedCaseId, setDispatchedCaseId] = useState("");

  // Holographic Clock HUD States
  const [currentClockTime, setCurrentClockTime] = useState("");
  const [currentClockDate, setCurrentClockDate] = useState("");
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentClockTime(now.toLocaleTimeString());
      setCurrentClockDate(now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Floating Language Selector State
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const languagesList = ["English", "മലയാളം", "Hindi"];
  const languageLabels: Record<string, string> = {
    English: "GPS COORDINATES RESOLVED",
    മലയാളം: "ജിപിഎസ് കോർഡിനേറ്റുകൾ സ്ഥിരീകരിച്ചു",
    Hindi: "जीपीएस निर्देशांक हल हो गए"
  };

  // Helper translation mapping getter
  const t = (key: string) => {
    return translations[selectedLanguage]?.[key] || translations["English"]?.[key] || key;
  };

  // Cyber console terminal check logs
  const [cyberCodeLog, setCyberCodeLog] = useState<string[]>([]);
  useEffect(() => {
    const initialLogs = [
      "> SYSTEM SCAN INITIATED",
      "> NETWORK FILTER APPLIED",
      "> SECURITY CHECK COMPLETE",
      "> THREATS DETECTED: 0",
      "> SYSTEM PROTECTED"
    ];
    setCyberCodeLog(initialLogs);
    const interval = setInterval(() => {
      const logs = [
        "> SYSTEM SCAN RUNNING...",
        "> FIREWALL STATUS: ENABLED",
        "> THREAT MONITOR: ACTIVE",
        "> SECURITY LEVEL: MAXIMUM",
        "> PORT CHECK COMPLETE: SECURE"
      ];
      setCyberCodeLog(prev => [...prev.slice(1), logs[Math.floor(Math.random() * logs.length)]]);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Live Vehicle Routing Simulation
  const [vehicleX, setVehicleX] = useState(15);
  const [vehicleY, setVehicleY] = useState(65);
  const [vehicleEta, setVehicleEta] = useState(145);
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicleX(prev => (prev >= 85 ? 15 : prev + 1.2));
      setVehicleY(prev => (prev <= 25 ? 65 : prev - 0.7));
      setVehicleEta(prev => (prev <= 10 ? 145 : prev - 2));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Citizen Privacy Protocol masking state simulator
  const [maskedCitizenId, setMaskedCitizenId] = useState("ASW_05_******");
  useEffect(() => {
    const interval = setInterval(() => {
      const randomStr = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join("");
      setMaskedCitizenId(`CIT_SECURE_${randomStr}`);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Live Responder Tracker simulator states
  const [patrolCoords, setPatrolCoords] = useState("11.2594° N, 75.7830° E");
  const [patrolStatus, setPatrolStatus] = useState("PATROLLING");
  useEffect(() => {
    const interval = setInterval(() => {
      const yOffset = (Math.random() * 0.0020 - 0.0010).toFixed(4);
      const xOffset = (Math.random() * 0.0020 - 0.0010).toFixed(4);
      setPatrolCoords(`${(11.2594 + parseFloat(yOffset)).toFixed(4)}° N, ${(75.7830 + parseFloat(xOffset)).toFixed(4)}° E`);
      setPatrolStatus(Math.random() > 0.7 ? "DISPATCHING" : "PATROLLING");
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Select mock file
  const handleMockFileUpload = () => {
    const files = ["cctv_frame_capture.mp4", "complaint_billing.pdf", "evidence_incident.jpg"];
    const randomFile = files[Math.floor(Math.random() * files.length)];
    setAttachedFile(randomFile);
    toast.success(`Attached evidence file: ${randomFile}`);
  };

  // Mock location coordinate attachment
  const handleCoordinatesPin = (xPercent: number, yPercent: number) => {
    const lat = (11.2580 + (yPercent / 1000)).toFixed(4);
    const lng = (75.7820 + (xPercent / 1000)).toFixed(4);
    setPinnedCoords(`${lat}° N, ${lng}° E`);
    toast.success(`GPS coordinates locked: ${lat}° N, ${lng}° E`);
  };

  // SOS button press controls
  const startSosTimer = () => {
    setIsHoldingSos(true);
    setSosHoldProgress(0);
    setSosCountdown(3);
    
    let count = 0;
    const interval = setInterval(() => {
      count += 5;
      setSosHoldProgress(count);
      
      if (count >= 100) {
        clearInterval(interval);
        triggerSosAlarm();
      } else if (count >= 66) {
        setSosCountdown(1);
      } else if (count >= 33) {
        setSosCountdown(2);
      }
    }, 100);
    
    setSosTimer(interval);
  };

  const cancelSosTimer = () => {
    setIsHoldingSos(false);
    setSosHoldProgress(0);
    if (sosTimer) {
      clearInterval(sosTimer);
      setSosTimer(null);
    }
  };

  // Trigger dispatch active SOS alarm
  const triggerSosAlarm = () => {
    const caseId = `SOS-${Math.floor(100000 + Math.random() * 900000)}B`;
    setDispatchedCaseId(caseId);
    setSosDispatched(true);
    setIsHoldingSos(false);
    
    const newSos = {
      id: `blip-${Date.now()}`,
      label: "SOS Alert Dispatched",
      coordinates: "11.2594° N, 75.7830° E",
      type: "distress",
      time: "Just now",
      x: 48,
      y: 48,
      details: {
        unit: "MCA Response Unit 2",
        eta: "1m 15s",
        severity: "CRITICAL",
        citizen: "Aswani (Roll No 5)"
      }
    };
    
    setRadarPoints(prev => [newSos, ...prev]);
    toast.error("EMERGENCY SIGNAL BROADCAST SUCCESSFUL. RESPONDERS EN ROUTE.");
  };

  // Handle report submission
  const handleReportSubmit = () => {
    if (!reportDesc || reportDesc.length < 10) {
      toast.error("Please provide a description of the incident (min 10 characters).");
      return;
    }
    
    setIsSubmittingReport(true);
    
    setTimeout(() => {
      const caseId = `CSR-${Math.floor(100000 + Math.random() * 900000)}X`;
      setGeneratedCaseId(caseId);
      setIsSubmittingReport(false);
      setReportStep(5);
      setShowConfetti(true);
      
      const newActivity = {
        id: `blip-${Date.now()}`,
        label: "Complaint Logged",
        coordinates: pinnedCoords || "11.2594° N, 75.7830° E",
        type: "robbery",
        time: "Just now",
        x: Math.floor(Math.random() * 60 + 20),
        y: Math.floor(Math.random() * 60 + 20),
        details: {
          unit: "Awaiting Assignment",
          evidence: attachedFile || "No attachments",
          status: "PENDING_REVIEW",
          citizen: "Citizen Portal Guest File"
        }
      };
      
      setRadarPoints(prev => [newActivity, ...prev]);
      toast.success("Incident registered securely in the platform archives.");
    }, 2000);
  };

  const renderStatusPulse = (translationKey: string, glowColor: "emerald" | "blue" = "blue") => {
    const text = t(translationKey);
    const parts = text.split(":");
    if (parts.length === 2) {
      const label = parts[0];
      const val = parts[1];
      const glowClass = glowColor === "emerald" 
        ? "text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse font-extrabold" 
        : "text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse font-extrabold";
      return (
        <span className="inline-flex items-center gap-1 font-mono">
          <span className="opacity-90">{label}:</span>
          <span className={glowClass}>{val}</span>
        </span>
      );
    }
    return <span>{text}</span>;
  };

  const renderSplitText = (translationKey: string, index: number, fallback: string = "") => {
    const text = t(translationKey);
    const parts = text.split(":");
    if (parts.length >= 2) {
      return parts[index].trim();
    }
    return index === 0 ? text : fallback;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 selection:bg-blue-500/30 overflow-hidden relative font-sans bg-security-grid transition-colors duration-300 animate-siren-glow">
      
      {/* Background blobs with responsive blur */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-blue-500/5 dark:bg-blue-900/10 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] rounded-full bg-purple-500/5 dark:bg-purple-900/10 blur-[130px]" />
      </div>

      {/* FLOATING SYSTEM STATUS HEADER Cockpit */}
      <div className="sticky top-0 z-45 w-full border-b border-slate-200/55 dark:border-white/5 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md px-6 py-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3.5 cursor-pointer"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 dark:from-blue-600/30 dark:to-indigo-600/30 rounded-xl flex items-center justify-center border border-blue-500/30 dark:border-blue-500/40 shadow-sm">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-lg font-black tracking-wider uppercase text-slate-900 dark:text-white">{t("brand")}</span>
            </motion.div>
          </Link>

          {/* Connected Network Cockpit Tags */}
          <div className="hidden lg:flex items-center gap-5 text-[10px] font-bold tracking-widest text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>POLICE NETWORK: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">ONLINE</strong></span>
            </div>
            <span className="text-slate-200 dark:text-white/10">|</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>DISPATCH: <strong className="text-blue-600 dark:text-blue-400 font-extrabold font-mono">CONNECTED</strong></span>
            </div>
            <span className="text-slate-200 dark:text-white/10">|</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>GPS LOGS: <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold font-mono">ACTIVE</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-bold transition-all">
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" style={{ animationDuration: "12s" }} />
              <div className="flex gap-1.5">
                {languagesList.map(lang => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      toast.success(languageLabels[lang]);
                    }}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-black border transition-all cursor-pointer ${
                      selectedLanguage === lang
                        ? "bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400"
                        : "bg-transparent border-transparent text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {lang === "മലയാളം" ? "MAL" : lang.substring(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign In link */}
            <Link
              href="/login"
              className="text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 text-xs font-bold transition-all"
            >
              Sign In
            </Link>

            {/* Admin Console link */}
            <Link
              href="/login"
              title="Admin Panel Secure Access"
              className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 text-xs font-bold transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>

            {/* Get Started primary button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl border border-transparent transition-all shadow-sm shadow-blue-500/25 active:scale-95 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* HERO SECTION & COMBINED CLOCK + SATELLITE HUD */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-14 flex flex-col lg:flex-row items-center gap-14">
        
        {/* Left Hero Details */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2.5 px-4.5 py-1.8 rounded-full border border-blue-500/20 bg-blue-500/10 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            {t("realTimeLabel")}
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-5xl md:text-7.5xl font-black tracking-tight mb-6 leading-[1.05] text-slate-900 dark:text-white"
          >
            {t("safetyPalm")} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              {t("hands")}
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-xl leading-relaxed"
          >
            {t("heroDesc")}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
          >
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-slate-950 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 hover:bg-slate-900 dark:hover:from-blue-500 dark:hover:to-indigo-500 text-white font-bold px-8 py-4.5 rounded-2xl shadow-lg shadow-slate-900/10 dark:shadow-blue-500/20 transition-all border border-transparent dark:border-blue-400/20 cursor-pointer"
            >
              {t("reportBtn")}
              <ChevronRight className="w-5 h-5" />
            </motion.button>

            <Link href="/login" className="w-full sm:w-auto">
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white dark:bg-white/5 font-bold px-8 py-4.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                {t("policeAccess")}
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Right Side: Holographic Combined Clock + Satellite Link HUD */}
        <div className="flex-1 relative flex flex-col items-center justify-center pointer-events-none select-none z-10 w-full max-w-sm py-8 lg:py-0">
          <div className="relative w-80 h-80 rounded-full border border-blue-500/10 dark:border-blue-500/20 flex items-center justify-center">
            
            {/* Spinning satellite orbital lines */}
            <div className="absolute inset-0 rounded-full border border-blue-500/10 dark:border-blue-500/20 animate-spin" style={{ animationDuration: "16s" }} />
            <div className="absolute inset-6 rounded-full border border-dashed border-indigo-500/10 dark:border-indigo-500/20 animate-[spin_25s_infinite_reverse]" />
            <div className="absolute inset-12 rounded-full border border-slate-200 dark:border-white/5" />
            
            {/* Rotating globe vector */}
            <div className="absolute top-2 w-8 h-8 rounded-full border border-blue-500/20 flex items-center justify-center bg-blue-500/5 animate-[spin_10s_linear_infinite]">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="z-10 text-center">
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 tracking-[0.25em] uppercase">{t("cmdTime")}</span>
              <h2 className="text-3xl font-black font-mono tracking-widest text-slate-950 dark:text-white mt-1 drop-shadow-sm dark:drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                {currentClockTime || "00:00:00"}
              </h2>
              
              {/* Split separator divider */}
              <div className="w-32 h-[1px] bg-slate-200 dark:bg-white/10 mx-auto my-3" />

              {/* Police Satellite Communications panel telemetry */}
              <span className="text-[8px] font-black text-indigo-500 tracking-wider uppercase block">{t("satComm")}</span>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-bold text-slate-800 dark:text-slate-300 font-mono">{t("satOnline")}</span>
              </div>
              <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold font-mono tracking-wide mt-1">{t("satMetrics")}</p>
            </div>
          </div>
        </div>

      </header>

      {/* ==============================================================================
      TACTICAL CONTROL ENVIRONMENT (Interactive Radar & Patrol Networks)
      ============================================================================== */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        
        {/* Glowing HUD Border Deck Container */}
        <div className="w-full bg-white/70 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 lg:p-10 shadow-xl dark:shadow-[0_0_50px_rgba(0,0,0,0.4)] backdrop-blur-md relative overflow-hidden flex flex-col gap-10">
          
          {/* Deck background grids */}
          <div className="absolute inset-0 bg-security-grid pointer-events-none opacity-20" />
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[90px] pointer-events-none" />

          {/* Top Panel Cockpit Status: COMMAND RESPONSE CENTER */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6 gap-4 z-10">
            <div>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase">{t("cmdCenterSubtitle")}</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">{t("cmdCenterTitle")}</h3>
            </div>

            {/* Cinematic Command Response Center Tags */}
            <div className="flex flex-wrap items-center gap-6 text-[10px] font-bold font-mono text-slate-500">
              <div>
                <span>{t("sysOnlineTag")}</span>
              </div>
              <div>
                <span>{t("actUnitsTag")}</span>
              </div>
              <div>
                <span>{t("cmdNetTag")}</span>
              </div>
              <div>
                <span>{t("secTag")}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-8 items-stretch z-10">
            
            {/* LEFT: Concentric Interactive Radar Scope (RESPONSE LOCATION TRACKING) */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[380px] border border-slate-200 dark:border-white/5 rounded-3xl p-6 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-xl">
              
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" style={{ animationDuration: "12s" }} />
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">{t("radarScopeSubtitle")}</span>
              </div>

              {/* Central Concentric Radar circles */}
              <div className="relative w-80 h-80 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center">
                <div className="absolute inset-8 rounded-full border border-slate-200 dark:border-white/10" />
                <div className="absolute inset-16 rounded-full border border-slate-200 dark:border-white/10" />
                <div className="absolute inset-24 rounded-full border border-slate-200 dark:border-white/10" />
                
                {/* Rotating scanner vector line */}
                <div className="radar-sweep-line" />

                {/* Radar target coordinate blips */}
                {radarPoints.map((blip) => {
                  const isDistress = blip.type === "distress";
                  return (
                    <button
                      key={blip.id}
                      onClick={() => setSelectedRadarBlip(blip)}
                      style={{ left: `${blip.x}%`, top: `${blip.y}%` }}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 outline-none border-none bg-transparent group"
                    >
                      <span className="relative flex h-4 w-4 items-center justify-center">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isDistress ? "bg-red-400" : "bg-blue-400"
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-[0_0_10px_rgba(239,68,68,0.5)] ${
                          isDistress ? "bg-red-500" : "bg-blue-500"
                        }`}></span>
                      </span>

                      {/* Tooltip on hover */}
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 bg-slate-900/90 text-white text-[9px] font-bold px-2 py-1 rounded border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 font-mono">
                        {blip.label} ({blip.details.unit})
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 text-center">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{t("radarScopeLabel")}</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                  {t("radarSweepLabel")}
                </p>
              </div>
            </div>

            {/* RIGHT: Live Patrol Operations Map Tracker */}
            <div className="flex-1 flex flex-col border border-slate-200 dark:border-white/5 rounded-3xl p-6 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-xl justify-between relative min-h-[380px] overflow-hidden">
              
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-blue-500/30 rounded-tl-3xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-500/30 rounded-tr-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-blue-500/30 rounded-bl-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-blue-500/30 rounded-br-3xl pointer-events-none" />

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">{t("livePatrolLabel")}</span>
              </div>

              <div className="absolute top-4 right-4 flex flex-wrap justify-end gap-3 text-right text-[9px] font-bold font-mono text-blue-600 dark:text-blue-400 z-10">
                <span>{renderStatusPulse("patrolActiveUnits", "blue")}</span>
                <span>{renderStatusPulse("patrolSystemMonitoring", "blue")}</span>
                <span>{renderStatusPulse("patrolResponseReady", "emerald")}</span>
              </div>

              {/* Grid drawing map canvas */}
              <div className="w-full h-56 bg-slate-100 dark:bg-slate-950/65 rounded-2xl relative overflow-hidden bg-security-grid border border-slate-200 dark:border-white/5 mt-8">
                {/* Scanner sweep beam effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent animate-scan-sweep pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/5 to-transparent animate-spin-slow pointer-events-none" style={{ animationDuration: "14s" }} />

                {/* Floating digital grid nodes */}
                <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:16px_16px] pointer-events-none animate-pulse" />

                {/* Inner HUD borders */}
                <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-blue-500/40 pointer-events-none" />
                <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-blue-500/40 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-blue-500/40 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-blue-500/40 pointer-events-none" />

                {/* SVG Route Paths */}
                <svg className="absolute inset-0 w-full h-full">
                  <path 
                    d="M 50 160 Q 150 40, 280 120 T 360 40" 
                    fill="none" 
                    stroke="rgba(59, 130, 246, 0.2)" 
                    strokeWidth="2" 
                    strokeDasharray="4,4"
                  />
                  <motion.path 
                    d="M 50 160 Q 150 40, 280 120 T 360 40" 
                    fill="none" 
                    stroke="#3B82F6" 
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  />
                </svg>

                {/* Dispatch Destination Node coordinate pin */}
                <div className="absolute top-[40px] right-[40px] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping absolute" />
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 z-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                </div>

                {/* Moving Police Patrol vehicle beacon */}
                <div 
                  style={{ left: `${vehicleX}%`, top: `${vehicleY}%` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg border border-blue-400 transition-all duration-300 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                >
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                </div>
              </div>

              {/* RESPONSE PERFORMANCE TRACKING */}
              <div className="border-t border-slate-200 dark:border-white/5 pt-4 mt-4 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono flex flex-col sm:flex-row justify-between gap-4 relative">
                
                {/* HUD borders */}
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-blue-500/25 pointer-events-none" />
                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-blue-500/25 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-blue-500/25 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-blue-500/25 pointer-events-none" />

                <div className="space-y-1.5 z-10 p-1">
                  <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.4)] animate-pulse" />
                    {t("routeMetricsLabel")}
                  </p>
                  
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-600 dark:text-slate-400">
                    <Radio className="w-3 h-3 text-blue-500 animate-[pulse_2.5s_infinite]" />
                    <span className="opacity-95">{renderSplitText("dispatchUnit", 0)}:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{renderSplitText("dispatchUnit", 1)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] text-slate-600 dark:text-slate-400">
                    <Map className="w-3 h-3 text-emerald-500" />
                    {renderStatusPulse("routeStatus", "emerald")}
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] text-slate-600 dark:text-slate-400">
                    <Activity className="w-3 h-3 text-blue-500" />
                    {renderStatusPulse("movementSync", "blue")}
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1.5 z-10 p-1">
                  <p className="font-bold text-slate-950 dark:text-white uppercase text-[9px] flex items-center sm:justify-end gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.4)] animate-pulse" />
                    {t("currentActivityLabel")}
                  </p>
                  
                  <div className="flex items-center sm:justify-end gap-1.5 text-[9px] text-slate-600 dark:text-slate-400">
                    <Navigation className="w-3 h-3 text-purple-500 animate-[spin_12s_linear_infinite]" />
                    <span className="opacity-95">{t("patrolUnit")} ({t("patrolRoute")})</span>
                  </div>

                  <div className="flex items-center sm:justify-end gap-1.5 text-[9px] text-slate-600 dark:text-slate-400">
                    <Compass className="w-3 h-3 text-blue-500" />
                    <span className="opacity-95">{t("patrolMovement")}</span>
                  </div>

                  <div className="flex items-center sm:justify-end gap-1.5 text-[9px] text-blue-600 dark:text-blue-400 font-extrabold">
                    <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" style={{ animationDuration: "6s" }} />
                    <span className="opacity-95">{renderSplitText("etaCalculating", 0)}:</span>
                    <span className="text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse inline-flex items-center">
                      {renderSplitText("etaCalculating", 1, "CALCULATING").replace("...", "")}
                      <span className="inline-block animate-loading-dots w-4 text-left ml-0.5" />
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* LOWER SECTION: Cyber logs, Dispatch wave, and Privacy mask */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
            
            {/* POLICE CYBER DEFENSE CENTER */}
            <div className="border border-slate-200 dark:border-white/5 rounded-3xl p-5 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-xl relative flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">{t("cyberCommandLabel")}</span>
                  </div>
                  <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">SYS: SECURE</span>
                </div>
                
                {/* Real-world cyber logs */}
                <div className="space-y-1 font-mono text-[9px] text-slate-600 dark:text-emerald-400 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-xl overflow-hidden leading-snug">
                  {cyberCodeLog.map((log, i) => (
                    <div key={i} className="truncate">{log}</div>
                  ))}
                </div>
              </div>

              <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-white/5 uppercase font-bold flex flex-wrap justify-between gap-1">
                <span>{t("cyberSystemSecure")} | {t("cyberNetworkProtected")}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{t("cyberSecLevel")}</span>
              </div>
            </div>

            {/* EMERGENCY COMMUNICATION NETWORK */}
            <div className="border border-slate-200 dark:border-white/5 rounded-3xl p-5 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-xl relative flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Rss className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">{t("dispatchControlLabel")}</span>
                  </div>
                  
                  {/* Waveforms */}
                  <div className="flex items-end gap-0.5 h-3">
                    {[0.5, 1.0, 0.3, 0.7, 0.4].map((delay, index) => (
                      <div 
                        key={index}
                        className="w-0.5 bg-blue-500 animate-wave-bounce" 
                        style={{ height: "100%", animationDelay: `${delay}s`, animationDuration: "1s" }}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-[9px] leading-relaxed font-mono">
                  <div className="flex justify-between mb-1">
                    <span>{renderSplitText("dispatchStatusConnected", 0)}:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{renderSplitText("dispatchStatusConnected", 1)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{renderSplitText("dispatchEmergencyChannel", 0)}:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{renderSplitText("dispatchEmergencyChannel", 1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{renderSplitText("dispatchUnitAvailable", 0)}:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{renderSplitText("dispatchUnitAvailable", 1)}</span>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-3 uppercase font-bold tracking-wide">
                {t("dispatchNetworkType")}
              </div>
            </div>

            {/* CITIZEN IDENTITY PROTECTION */}
            <div className="border border-slate-200 dark:border-white/5 rounded-3xl p-5 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-xl relative flex flex-col justify-between min-h-[170px] overflow-hidden">
              <div className="absolute top-0 w-[40%] h-full bg-gradient-to-r from-transparent via-white/5 dark:via-white/10 to-transparent skew-x-12 animate-sheen-sweep pointer-events-none" />
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">{t("privacyProtocolLabel")}</span>
                  </div>
                  <span className="text-[8px] font-bold text-emerald-500 uppercase">{t("privacyStatusProtected")}</span>
                </div>
                
                <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-[9px] leading-relaxed font-mono">
                  <div className="flex justify-between mb-1">
                    <span>{t("privacyIdentityShield")}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{t("privacyPersonalData")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{renderSplitText("privacyCitizenId", 0)}:</span>
                    <span className="text-slate-400 truncate max-w-[120px] font-bold">{maskedCitizenId}</span>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-3 uppercase font-bold tracking-wide">
                {t("privacySecurityMethod")}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* MUKKOM POLICE STATION DETAILS SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase">Kozhikode Rural Police District</span>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">Mukkom Police Station</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* STATION INFO & CONTACT */}
          <div className="border border-slate-200 dark:border-white/5 rounded-3xl p-6 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-xl relative flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-[40%] h-[150%] bg-gradient-to-r from-transparent via-blue-500/5 to-transparent skew-x-12 pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Command Center</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">MUKKOM STATION DESK</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Open 24/7</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 p-4 rounded-2xl flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Official Address</p>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                      Koyilandy - Edavanna Road, Health Centre Road,<br />
                      Mukkom Post, Kozhikode, Kerala - 673602
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 p-4 rounded-2xl hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" />
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mobile</p>
                    </div>
                    <a href="tel:9497947245" className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">9497947245</a>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 p-4 rounded-2xl hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" />
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Landline</p>
                    </div>
                    <a href="tel:04952297133" className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">0495-2297133</a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Radio className="w-3.5 h-3.5 text-emerald-500" />
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">VPN</p>
                    </div>
                    <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">15229</p>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 p-4 rounded-2xl hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-3.5 h-3.5 text-purple-500" />
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email</p>
                    </div>
                    <a href="mailto:shomukkmkkdrl.pol@kerala.gov.in" className="text-[11px] font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block transition-colors" title="shomukkmkkdrl.pol@kerala.gov.in">shomukkmkkdrl.pol@kerala.gov.in</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* JURISDICTION & DEMOGRAPHICS */}
          <div className="border border-slate-200 dark:border-white/5 rounded-3xl p-6 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-xl relative flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute bottom-0 left-0 w-[60%] h-[60%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[60px] pointer-events-none rounded-full" />
            
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest uppercase">Jurisdiction Profile</span>
                </div>
              </div>

              <div className="space-y-3">
                
                {/* Area & Population */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 p-3.5 rounded-2xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Area</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-baseline gap-1">
                      89.63 <span className="text-[10px] font-semibold text-slate-500">sq. km</span>
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 p-3.5 rounded-2xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Population</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-baseline gap-1">
                      102,312 <span className="text-[10px] font-semibold text-slate-500">citizens</span>
                    </p>
                  </div>
                </div>

                {/* Local Bodies */}
                <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 p-4 rounded-2xl space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Municipality & Panchayaths</p>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-5">
                      Mukkom Municipality, Karassery Grama Panchayath, Kodiyathoor Grama Panchayath
                    </p>
                  </div>
                  
                  <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Map className="w-3.5 h-3.5 text-purple-500" />
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Covered Villages</p>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-5">
                      Thazhekode, Neeleswaram, Kumaranelloor, Kakkad, Kodiyathor
                    </p>
                  </div>
                </div>

                {/* Borders */}
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-500/10 p-3.5 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Border Districts</p>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      Shares borders with Malappuram and Kozhikode City Police Districts.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* MUKKOM POLICE STATION INFO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase">Kozhikode Rural</span>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">Mukkom Police Station</h3>
        </div>

        <div className="border border-slate-200 dark:border-white/5 rounded-3xl bg-white/60 dark:bg-slate-950/20 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 relative z-10">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Emergency Lines</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">Mobile: <a href="tel:9497947245" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">9497947245</a></p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">Landline: <a href="tel:04952297133" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">0495-2297133</a></p>
                  <p className="text-xs text-slate-500 font-mono mt-1">VPN: 15229</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Official Email</p>
                  <a href="mailto:shomukkmkkdrl.pol@kerala.gov.in" className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors break-all">shomukkmkkdrl.pol@kerala.gov.in</a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Operating Hours</p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping absolute" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">OPEN 24 HOURS, 7 DAYS A WEEK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Station Address</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                    Koyilandy - Edavanna Road, <br/>
                    Health Centre Road, Mukkom Post, <br/>
                    Kozhikode, Kerala - 673602
                  </p>
                  <a href="https://maps.google.com/?q=Mukkom+Police+Station+Kerala" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 mt-2 hover:underline">
                    View on Map <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Map className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Jurisdiction Metrics</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">Total Area: <span className="font-normal text-slate-600 dark:text-slate-400">89.63 sq km</span></p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">Population: <span className="font-normal text-slate-600 dark:text-slate-400">102,312 citizens</span></p>
                </div>
              </div>
            </div>

            {/* Jurisdiction Details */}
            <div className="space-y-6 lg:border-l border-slate-200 dark:border-white/5 lg:pl-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Covered Territories</p>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Municipality</span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">Mukkom Municipality</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Grama Panchayaths</span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">Karassery & Kodiyathoor</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Villages</span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">Thazhekode, Neeleswaram, Kumaranelloor, Kakkad, Kodiyathor</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Bordering Districts</span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">Malappuram & Kozhikode City</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HORIZONTAL SAFETY TIMELINE TRACKER (Incident Timeline Visualization) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase">{t("investigationCycleLabel")}</span>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{t("investigationCycleSubtitle")}</h3>
        </div>

        {/* Timeline Horizontal Line container */}
        <div className="relative border border-slate-200 dark:border-white/5 rounded-3xl p-8 bg-white/60 dark:bg-slate-950/20 backdrop-blur-md overflow-hidden">
          <div className="absolute inset-0 bg-security-grid pointer-events-none opacity-10" />

          {/* SVG Progress path */}
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
            
            {/* The horizontal connecting line */}
            <div className="absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-slate-200 dark:bg-slate-800 hidden md:block z-0">
              <motion.div 
                className="h-full bg-blue-600"
                initial={{ width: "0%" }}
                animate={{ width: `${(timelineStep / 4) * 100}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>

            {timelineNodes.map((node, index) => {
              const isActive = index <= timelineStep;
              const isSelected = index === timelineStep;
              return (
                <button
                  key={index}
                  onClick={() => setTimelineStep(index)}
                  className="flex-1 flex flex-col items-center text-center z-10 cursor-pointer outline-none border-none bg-transparent"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 ${
                    isSelected 
                      ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110" 
                      : isActive 
                        ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400" 
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500"
                  }`}>
                    {index === 0 && <FileEdit className="w-5.5 h-5.5" />}
                    {index === 1 && <FolderLock className="w-5.5 h-5.5" />}
                    {index === 2 && <Users className="w-5.5 h-5.5" />}
                    {index === 3 && <Radio className="w-5.5 h-5.5 animate-pulse" />}
                    {index === 4 && <CheckCircle2 className="w-5.5 h-5.5" />}
                  </div>

                  <h5 className={`text-xs font-bold mt-4 transition-colors uppercase ${
                    isActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                  }`}>
                    {node.title}
                  </h5>
                </button>
              );
            })}

          </div>

          {/* Active step description details card display */}
          <div className="mt-8 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-2xl p-5 text-center max-w-xl mx-auto z-10 relative">
            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase">{t("activePhaseLogger")}</span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 uppercase">{timelineNodes[timelineStep].title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{timelineNodes[timelineStep].desc}</p>
          </div>

        </div>
      </section>

      {/* FLOATING SYSTEMS HUDS: Language Selector, SOS, and Police Network Pulse */}
      <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3.5">
        


        {/* Concentric Interactive Radar log detail overlay drawer */}
        <AnimatePresence>
          {selectedRadarBlip && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-2xl w-80 text-left relative z-50 animate-siren-glow"
            >
              <button 
                onClick={() => setSelectedRadarBlip(null)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-200 dark:border-white/5">
                <Compass className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                <h5 className="font-extrabold text-slate-900 dark:text-white text-xs tracking-wider uppercase">{t("activeAlerts")}</h5>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{t("responseEvent")}</span>
                  <span className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedRadarBlip.label}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{t("statusTracking")}</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{selectedRadarBlip.coordinates}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 space-y-1">
                  <div>
                    <span className="text-[9px] font-bold text-slate-800 dark:text-slate-300 block">{t("sosBeacon")}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-800 dark:text-slate-300 block">{t("assignedUnit")}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-800 dark:text-slate-300 block">{t("incidentType")}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-800 dark:text-slate-300 block">{t("assignedOfficer")}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-800 dark:text-slate-300 block">{t("caseStatus")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>

      {/* SIGN-IN REQUIRED INTERCEPTOR MODAL */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-3xl w-full max-w-md p-7 relative shadow-2xl z-10 animate-siren-glow"
            >
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center py-3">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Sign In Required</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">Please sign in or create an account to report an incident and track your case status.</p>

                <div className="mt-8 flex flex-col gap-3">
                  <Link href="/login" className="w-full">
                    <button className="w-full bg-slate-950 hover:bg-slate-900 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500 text-white text-xs font-bold py-3.5 rounded-xl border border-transparent dark:border-blue-400/20 shadow-md cursor-pointer transition-all">
                      Sign In
                    </button>
                  </Link>

                  <Link href="/register" className="w-full">
                    <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold py-3.5 rounded-xl cursor-pointer transition-all">
                      Register
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REPORT AN INCIDENT WIZARD MODAL */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportModalOpen(false)}
              className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-3xl w-full max-w-lg p-7 relative shadow-2xl overflow-hidden z-10 animate-siren-glow"
            >
              {showConfetti && <ConfettiEffect />}

              <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-white/5 mb-6">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-wide">{t("reportDeskTitle")}</h3>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reportStep < 5 && (
                <div className="flex justify-between items-center gap-2 mb-6">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 flex-1 rounded-full ${
                        idx + 1 <= reportStep ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
                      } transition-all duration-300`}
                    />
                  ))}
                </div>
              )}

              <div className="min-h-[220px]">
                
                {/* STEP 1: Select Category */}
                {reportStep === 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3.5 uppercase tracking-wider">{t("selectCategory")}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "Theft / Burglary", icon: FileText },
                        { name: "Assault / Threat", icon: AlertTriangle },
                        { name: "Cyber Fraud / Scam", icon: Lock },
                        { name: "Harassment", icon: Users },
                        { name: "Other Incident", icon: AlertCircle }
                      ].map((item) => (
                        <button
                          key={item.name}
                          onClick={() => setReportCategory(item.name)}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                            reportCategory === item.name 
                              ? "bg-blue-600/10 border-blue-500 text-slate-900 dark:text-white shadow-sm" 
                              : "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-800"
                          }`}
                        >
                          <item.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Description */}
                {reportStep === 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">{t("describeIncident")}</p>
                    <textarea
                      placeholder="Please details time, suspicious visual cues, vehicle descriptors, or physical threat descriptions..."
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400 dark:placeholder-slate-600 resize-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Minimum 10 characters required</span>
                      <span>{reportDesc.length} chars</span>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: File Upload */}
                {reportStep === 3 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider text-left">{t("uploadEvidence")}</p>
                    
                    <div 
                      onClick={handleMockFileUpload}
                      className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-blue-500/30 rounded-2xl p-8 bg-slate-50 dark:bg-slate-900/20 cursor-pointer transition-all flex flex-col items-center justify-center"
                    >
                      <FolderLock className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
                      <p className="text-xs text-slate-800 dark:text-slate-300 font-bold">Simulate Evidence Selector</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Supports PNG, JPG, MP4, and PDF</p>
                    </div>

                    {attachedFile && (
                      <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-mono text-slate-900 dark:text-white truncate max-w-[200px]">{attachedFile}</span>
                        </div>
                        <button 
                          onClick={() => setAttachedFile(null)} 
                          className="text-[10px] text-red-500 hover:text-red-400 cursor-pointer border-none bg-transparent"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 4: Pin Location */}
                {reportStep === 4 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3.5 uppercase tracking-wider">{t("locateGrid")}</p>
                    
                    <div className="w-full h-40 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl relative overflow-hidden bg-security-grid">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full border border-blue-500/10 animate-ping absolute" />
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                      </div>
                      
                      <div 
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          handleCoordinatesPin(x, y);
                        }}
                        className="absolute inset-0 z-10 cursor-crosshair"
                      />

                      {pinnedCoords && (
                        <div className="absolute bottom-3 left-3 bg-white dark:bg-[#020617]/95 px-3 py-1.5 rounded-lg border border-blue-500/30 text-[10px] font-mono text-slate-900 dark:text-white flex items-center gap-2 z-20 shadow-sm">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          GPS LOCKED: {pinnedCoords}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Click anywhere inside the grid map above to pin your report coordinates.</p>
                  </motion.div>
                )}

                {/* STEP 5: Success Lock */}
                {reportStep === 5 && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-4">
                    <div className="w-14 h-14 bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{t("complaintSecured")}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Your incident file was encrypted and successfully registered in the platform database.</p>

                    <div className="mt-5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl p-3.5 inline-block text-left">
                      <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">DATABASE REF ID</p>
                      <p className="text-sm font-mono text-slate-900 dark:text-white font-extrabold mt-0.5 tracking-wider">{generatedCaseId}</p>
                    </div>

                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        onClick={() => {
                          toast.success("Downloading copy of secured report...");
                        }}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Download Report
                      </button>
                      <button
                        onClick={() => setIsReportModalOpen(false)}
                        className="bg-slate-950 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#020617] text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Wizard Footer controls */}
              {reportStep < 5 && (
                <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-200 dark:border-white/5">
                  <button
                    disabled={reportStep === 1}
                    onClick={() => setReportStep(prev => prev - 1)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 cursor-pointer border-none bg-transparent"
                  >
                    Back
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsReportModalOpen(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-800 dark:hover:text-white px-4 py-2 rounded-xl cursor-pointer border-none bg-transparent"
                    >
                      Cancel
                    </button>
                    
                    {reportStep === 4 ? (
                      <button
                        onClick={handleReportSubmit}
                        disabled={isSubmittingReport}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 border border-blue-500 shadow-md cursor-pointer disabled:opacity-40"
                      >
                        {isSubmittingReport ? "Registering..." : "Submit Secure Report"}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (reportStep === 1 && !reportCategory) {
                            toast.error("Please select a crime category first.");
                            return;
                          }
                          if (reportStep === 2 && reportDesc.length < 10) {
                            toast.error("Please add details of the description (min 10 characters).");
                            return;
                          }
                          setReportStep(prev => prev + 1);
                        }}
                        className="bg-slate-950 dark:bg-white text-white dark:text-[#020617] text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
