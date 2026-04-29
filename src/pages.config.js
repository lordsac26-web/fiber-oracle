/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminPanel from './pages/AdminPanel';
import CalixSmxAnalysis from './pages/CalixSmxAnalysis';
import CapacityPlanning from './pages/CapacityPlanning';
import BendRadius from './pages/BendRadius';
import Brochure from './pages/Brochure';
import CertificationExam from './pages/CertificationExam';
import Certifications from './pages/Certifications';
import Cleaning from './pages/Cleaning';
import Contact from './pages/Contact';
import ContactAdmin from './pages/ContactAdmin';
import DataManagement from './pages/DataManagement';
import DocumentReview from './pages/DocumentReview';
import DocumentSearch from './pages/DocumentSearch';
import Education from './pages/Education';
import Fiber101 from './pages/Fiber101';
import Fiber102 from './pages/Fiber102';
import Fiber103 from './pages/Fiber103';
import FiberDoctor from './pages/FiberDoctor';
import FiberLocator from './pages/FiberLocator';
import FieldMode from './pages/FieldMode';
import Home from './pages/Home';
import Impairments from './pages/Impairments';
import IndustryLinks from './pages/IndustryLinks';
import JobReports from './pages/JobReports';
import KMLParser from './pages/KMLParser';
import LCPInfo from './pages/LCPInfo';
import LCPMap from './pages/LCPMap';
import LossBudget from './pages/LossBudget';
import OLTSTest from './pages/OLTSTest';
import OTDRAnalysis from './pages/OTDRAnalysis';
import OTDRTest from './pages/OTDRTest';
import OfflineDocuments from './pages/OfflineDocuments';
import OpticalCalculator from './pages/OpticalCalculator';
import PONLevels from './pages/PONLevels';
import PONPMAnalysis from './pages/PONPMAnalysis';
import PhotonAuditLogs from './pages/PhotonAuditLogs';
import PhotonChat from './pages/PhotonChat';
import PowerLevelCalc from './pages/PowerLevelCalc';
import ReferenceTables from './pages/ReferenceTables';
import ReportManagement from './pages/ReportManagement';
import Settings from './pages/Settings';
import SplitterLoss from './pages/SplitterLoss';
import StudyGuide from './pages/StudyGuide';
import UserGuide from './pages/UserGuide';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminPanel": AdminPanel,
    "CalixSmxAnalysis": CalixSmxAnalysis,
    "CapacityPlanning": CapacityPlanning,
    "BendRadius": BendRadius,
    "Brochure": Brochure,
    "CertificationExam": CertificationExam,
    "Certifications": Certifications,
    "Cleaning": Cleaning,
    "Contact": Contact,
    "ContactAdmin": ContactAdmin,
    "DataManagement": DataManagement,
    "DocumentReview": DocumentReview,
    "DocumentSearch": DocumentSearch,
    "Education": Education,
    "Fiber101": Fiber101,
    "Fiber102": Fiber102,
    "Fiber103": Fiber103,
    "FiberDoctor": FiberDoctor,
    "FiberLocator": FiberLocator,
    "FieldMode": FieldMode,
    "Home": Home,
    "Impairments": Impairments,
    "IndustryLinks": IndustryLinks,
    "JobReports": JobReports,
    "KMLParser": KMLParser,
    "LCPInfo": LCPInfo,
    "LCPMap": LCPMap,
    "LossBudget": LossBudget,
    "OLTSTest": OLTSTest,
    "OTDRAnalysis": OTDRAnalysis,
    "OTDRTest": OTDRTest,
    "OfflineDocuments": OfflineDocuments,
    "OpticalCalculator": OpticalCalculator,
    "PONLevels": PONLevels,
    "PONPMAnalysis": PONPMAnalysis,
    "PhotonAuditLogs": PhotonAuditLogs,
    "PhotonChat": PhotonChat,
    "PowerLevelCalc": PowerLevelCalc,
    "ReferenceTables": ReferenceTables,
    "ReportManagement": ReportManagement,
    "Settings": Settings,
    "SplitterLoss": SplitterLoss,
    "StudyGuide": StudyGuide,
    "UserGuide": UserGuide,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};