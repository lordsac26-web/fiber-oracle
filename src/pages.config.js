/**
 * pages.config.js - Page routing configuration
 *
 * ⚠️ THIS FILE IS NO LONGER AUTO-GENERATED.
 * It holds the ORIGINAL set of pages, rendered by the pagesConfig loop in App.jsx.
 *
 * ➤ When you add a NEW page, it will NOT be picked up here automatically.
 *   You MUST register it as an explicit <Route> in App.jsx (alongside the loop),
 *   applying the same LayoutWrapper the loop uses. See AlertThresholds /
 *   CertificationDashboard in App.jsx for the pattern.
 *
 * ➤ App.jsx is the source of truth for the full route table — not this file.
 *
 * EDITABLE VALUE: mainPage — controls which page renders at "/" (the landing page).
 *   It must match a key in the PAGES object below exactly.
 */
import CalixSmxAnalysis from './pages/CalixSmxAnalysis';
import CapacityPlanning from './pages/CapacityPlanning';
import BendRadius from './pages/BendRadius';
import CertificationExam from './pages/CertificationExam';
import Certifications from './pages/Certifications';
import Cleaning from './pages/Cleaning';
import Contact from './pages/Contact';
import ContactAdmin from './pages/ContactAdmin';
import DataManagement from './pages/DataManagement';
import Education from './pages/Education';
import Fiber101 from './pages/Fiber101';
import Fiber102 from './pages/Fiber102';
import Fiber103 from './pages/Fiber103';
import FiberDoctor from './pages/FiberDoctor';
import FiberLocator from './pages/FiberLocator';
import Home from './pages/Home';
import Impairments from './pages/Impairments';
import IndustryLinks from './pages/IndustryLinks';
import KMLParser from './pages/KMLParser';
import LCPInfo from './pages/LCPInfo';
import LCPMap from './pages/LCPMap';
import LossBudget from './pages/LossBudget';
import OLTSTest from './pages/OLTSTest';
import OTDRAnalysis from './pages/OTDRAnalysis';
import OTDRTest from './pages/OTDRTest';

import OpticalCalculator from './pages/OpticalCalculator';
import PONLevels from './pages/PONLevels';
import PONPMAnalysis from './pages/PONPMAnalysis';
import PowerLevelCalc from './pages/PowerLevelCalc';
import ReferenceTables from './pages/ReferenceTables';
import ReportManagement from './pages/ReportManagement';
import Settings from './pages/Settings';
import SplitterLoss from './pages/SplitterLoss';
import StudyGuide from './pages/StudyGuide';
import UserGuide from './pages/UserGuide';
import Standards from './pages/Standards';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CalixSmxAnalysis": CalixSmxAnalysis,
    "CapacityPlanning": CapacityPlanning,
    "BendRadius": BendRadius,
    "CertificationExam": CertificationExam,
    "Certifications": Certifications,
    "Cleaning": Cleaning,
    "Contact": Contact,
    "ContactAdmin": ContactAdmin,
    "DataManagement": DataManagement,
    "Education": Education,
    "Fiber101": Fiber101,
    "Fiber102": Fiber102,
    "Fiber103": Fiber103,
    "FiberDoctor": FiberDoctor,
    "FiberLocator": FiberLocator,
    "Home": Home,
    "Impairments": Impairments,
    "IndustryLinks": IndustryLinks,
    "KMLParser": KMLParser,
    "LCPInfo": LCPInfo,
    "LCPMap": LCPMap,
    "LossBudget": LossBudget,
    "OLTSTest": OLTSTest,
    "OTDRAnalysis": OTDRAnalysis,
    "OTDRTest": OTDRTest,
    "OpticalCalculator": OpticalCalculator,
    "PONLevels": PONLevels,
    "PONPMAnalysis": PONPMAnalysis,
    "PowerLevelCalc": PowerLevelCalc,
    "ReferenceTables": ReferenceTables,
    "ReportManagement": ReportManagement,
    "Settings": Settings,
    "SplitterLoss": SplitterLoss,
    "Standards": Standards,
    "StudyGuide": StudyGuide,
    "UserGuide": UserGuide,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};