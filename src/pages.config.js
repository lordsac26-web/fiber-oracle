import Home from './pages/Home';
import LossBudget from './pages/LossBudget';
import OLTSTest from './pages/OLTSTest';
import FiberDoctor from './pages/FiberDoctor';
import Cleaning from './pages/Cleaning';
import Impairments from './pages/Impairments';
import ReferenceTables from './pages/ReferenceTables';
import Settings from './pages/Settings';
import IndustryLinks from './pages/IndustryLinks';
import FiberLocator from './pages/FiberLocator';
import PONLevels from './pages/PONLevels';
import LCPInfo from './pages/LCPInfo';
import PowerLevelCalc from './pages/PowerLevelCalc';
import SplitterLoss from './pages/SplitterLoss';
import BendRadius from './pages/BendRadius';
import OTDRTest from './pages/OTDRTest';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "LossBudget": LossBudget,
    "OLTSTest": OLTSTest,
    "FiberDoctor": FiberDoctor,
    "Cleaning": Cleaning,
    "Impairments": Impairments,
    "ReferenceTables": ReferenceTables,
    "Settings": Settings,
    "IndustryLinks": IndustryLinks,
    "FiberLocator": FiberLocator,
    "PONLevels": PONLevels,
    "LCPInfo": LCPInfo,
    "PowerLevelCalc": PowerLevelCalc,
    "SplitterLoss": SplitterLoss,
    "BendRadius": BendRadius,
    "OTDRTest": OTDRTest,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};