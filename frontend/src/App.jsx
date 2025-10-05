import React, { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

import "./css/style.css";

// Import pages
// import Dashboard from "./pages/Dashboard";
// import Analytics from "./pages/Analytics";
// import Fintech from "./pages/Fintech";
// import Customers from "./pages/ecommerce/Customers";
// import Orders from "./pages/ecommerce/Orders";
// import Invoices from "./pages/ecommerce/Invoices";
// import Shop from "./pages/ecommerce/Shop";
// import Shop2 from "./pages/ecommerce/Shop2";
// import Product from "./pages/ecommerce/Product";
// import Cart from "./pages/ecommerce/Cart";
// import Cart2 from "./pages/ecommerce/Cart2";
// import Cart3 from "./pages/ecommerce/Cart3";
// import Pay from "./pages/ecommerce/Pay";
// import Campaigns from "./pages/Campaigns";
// import UsersTabs from "./pages/community/UsersTabs";
// import UsersTiles from "./pages/community/UsersTiles";
// import Profile from "./pages/community/Profile";
// import Feed from "./pages/community/Feed";
// import Forum from "./pages/community/Forum";
// import ForumPost from "./pages/community/ForumPost";
// import Meetups from "./pages/community/Meetups";
// import MeetupsPost from "./pages/community/MeetupsPost";
// import CreditCards from "./pages/finance/CreditCards";
// import Transactions from "./pages/finance/Transactions";
// import TransactionDetails from "./pages/finance/TransactionDetails";
// import JobListing from "./pages/job/JobListing";
// import JobPost from "./pages/job/JobPost";
// import CompanyProfile from "./pages/job/CompanyProfile";
// import Messages from "./pages/Messages";
// import TasksKanban from "./pages/tasks/TasksKanban";
// import TasksList from "./pages/tasks/TasksList";
// import Inbox from "./pages/Inbox";
// import Calendar from "./pages/Calendar";
// import Account from "./pages/settings/Account";
// import Notifications from "./pages/settings/Notifications";
// import Apps from "./pages/settings/Apps";
// import Plans from "./pages/settings/Plans";
// import Billing from "./pages/settings/Billing";
// import Feedback from "./pages/settings/Feedback";
// import Changelog from "./pages/utility/Changelog";
// import Roadmap from "./pages/utility/Roadmap";
// import Faqs from "./pages/utility/Faqs";
// import EmptyState from "./pages/utility/EmptyState";
import PageNotFound from "./pages/utility/PageNotFound";
// import Signin from "./pages/Signin";
// import Signup from "./pages/Signup";
// import ResetPassword from "./pages/ResetPassword";
// import Onboarding01 from "./pages/Onboarding01";
// import Onboarding02 from "./pages/Onboarding02";
// import Onboarding03 from "./pages/Onboarding03";
// import Onboarding04 from "./pages/Onboarding04";
// import ButtonPage from "./pages/component/ButtonPage";
// import FormPage from "./pages/component/FormPage";
// import DropdownPage from "./pages/component/DropdownPage";
// import AlertPage from "./pages/component/AlertPage";
// import ModalPage from "./pages/component/ModalPage";
// import PaginationPage from "./pages/component/PaginationPage";
// import TabsPage from "./pages/component/TabsPage";
// import BreadcrumbPage from "./pages/component/BreadcrumbPage";
// import BadgePage from "./pages/component/BadgePage";
// import AvatarPage from "./pages/component/AvatarPage";
// import TooltipPage from "./pages/component/TooltipPage";
// import AccordionPage from "./pages/component/AccordionPage";
// import IconsPage from "./pages/component/IconsPage";
import SchoolTestSelf from "./pages/schoolTest/SchoolTestSelf";
import SchoolTestClass from "./pages/schoolTest/SchoolTestClass";
import SchoolTestYear from "./pages/schoolTest/SchoolTestYear";
import SchoolTestSchool from "./pages/schoolTest/SchoolTestSchool";
import { authClient } from "./utils/betterAuthClient";
import UploadFile from "./pages/uploadFile/UploadFile";
import ExportFile from "./pages/exportFile/ExportFile";
import { queryClient } from "./utils/QueryClient";
import SchoolExerciseSelf from "./pages/schoolExercise/SchoolExerciseSelf";
import SchoolExerciseClass from "./pages/schoolExercise/SchoolExerciseClass";
import SchoolExerciseYear from "./pages/schoolExercise/SchoolExerciseYear";
import SchoolExerciseSchool from "./pages/schoolExercise/SchoolExerciseSchool";
import HomeExerciseSelf from "./pages/homeExercise/HomeExerciseSelf";
import HomeExerciseAllRecords from "./pages/homeExercise/HomeExerciseAllRecords";
import { useAllSchoolData, useQueryableSchoolData } from "./states/schoolData";
import { useSchoolTests } from "./states/schoolTest";

function App() {
  const location = useLocation();
  const { data: session } = authClient.useSession();

  const schoolData = useAllSchoolData();
  const testData = useSchoolTests();
  const queryableYearsAndClasses = useQueryableSchoolData();

  useEffect(() => {
    if (!session) {
      // redirect to login
    } else {
      // redirect to home
    }
    queryClient.invalidateQueries({ type: "session" });
  }, [session]);

  useEffect(() => {
    // authClient.signOut();
    // authClient.revokeSession();
    // authClient.signIn.username({
    //   username: "admin",
    //   password: "admin123",
    // });
  }, []);

  useEffect(() => {
    document.querySelector("html").style.scrollBehavior = "auto";
    window.scroll({ top: 0 });
    document.querySelector("html").style.scrollBehavior = "";
  }, [location.pathname]); // triggered on route change

  if (location.pathname === "/") {
    /*  TODO: determine what is the default page for student/teacher etc */

    return <Navigate to="/exportFile" replace />;
  }

  if (schoolData.isPending || testData.isPending || queryableYearsAndClasses.isPending) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Routes>
        <Route exact path="/schoolTest/self" element={<SchoolTestSelf />} />
        <Route exact path="/schoolTest/class" element={<SchoolTestClass />} />
        <Route exact path="/schoolTest/year" element={<SchoolTestYear />} />
        <Route exact path="/schoolTest/school" element={<SchoolTestSchool />} />
        <Route exact path="/schoolExercise/self" element={<SchoolExerciseSelf />} />
        <Route exact path="/schoolExercise/class" element={<SchoolExerciseClass />} />
        <Route exact path="/schoolExercise/year" element={<SchoolExerciseYear />} />
        <Route exact path="/schoolExercise/school" element={<SchoolExerciseSchool />} />
        <Route exact path="/homeExercise/self" element={<HomeExerciseSelf />} />
        <Route exact path="/homeExercise/allRecords" element={<HomeExerciseAllRecords />} />
        <Route exact path="/uploadFile" element={<UploadFile />} />
        <Route exact path="/exportFile" element={<ExportFile />} />

        {/* <Route exact path="/dashboard/analytics" element={<Analytics />} />
        <Route exact path="/dashboard/fintech" element={<Fintech />} />
        <Route exact path="/ecommerce/customers" element={<Customers />} />
        <Route exact path="/ecommerce/orders" element={<Orders />} />
        <Route exact path="/ecommerce/invoices" element={<Invoices />} />
        <Route exact path="/ecommerce/shop" element={<Shop />} />
        <Route exact path="/ecommerce/shop-2" element={<Shop2 />} />
        <Route exact path="/ecommerce/product" element={<Product />} />
        <Route exact path="/ecommerce/cart" element={<Cart />} />
        <Route exact path="/ecommerce/cart-2" element={<Cart2 />} />
        <Route exact path="/ecommerce/cart-3" element={<Cart3 />} />
        <Route exact path="/ecommerce/pay" element={<Pay />} />
        <Route exact path="/campaigns" element={<Campaigns />} />
        <Route exact path="/community/users-tabs" element={<UsersTabs />} />
        <Route exact path="/community/users-tiles" element={<UsersTiles />} />
        <Route exact path="/community/profile" element={<Profile />} />
        <Route exact path="/community/feed" element={<Feed />} />
        <Route exact path="/community/forum" element={<Forum />} />
        <Route exact path="/community/forum-post" element={<ForumPost />} />
        <Route exact path="/community/meetups" element={<Meetups />} />
        <Route exact path="/community/meetups-post" element={<MeetupsPost />} />
        <Route exact path="/finance/cards" element={<CreditCards />} />
        <Route exact path="/finance/transactions" element={<Transactions />} />
        <Route exact path="/finance/transaction-details" element={<TransactionDetails />} />
        <Route exact path="/job/job-listing" element={<JobListing />} />
        <Route exact path="/job/job-post" element={<JobPost />} />
        <Route exact path="/job/company-profile" element={<CompanyProfile />} />
        <Route exact path="/messages" element={<Messages />} />
        <Route exact path="/tasks/kanban" element={<TasksKanban />} />
        <Route exact path="/tasks/list" element={<TasksList />} />
        <Route exact path="/inbox" element={<Inbox />} />
        <Route exact path="/calendar" element={<Calendar />} />
        <Route exact path="/settings/account" element={<Account />} />
        <Route exact path="/settings/notifications" element={<Notifications />} />
        <Route exact path="/settings/apps" element={<Apps />} />
        <Route exact path="/settings/plans" element={<Plans />} />
        <Route exact path="/settings/billing" element={<Billing />} />
        <Route exact path="/settings/feedback" element={<Feedback />} />
        <Route exact path="/utility/changelog" element={<Changelog />} />
        <Route exact path="/utility/roadmap" element={<Roadmap />} />
        <Route exact path="/utility/faqs" element={<Faqs />} />
        <Route exact path="/utility/empty-state" element={<EmptyState />} />
        <Route exact path="/utility/404" element={<PageNotFound />} />
        <Route exact path="/signin" element={<Signin />} />
        <Route exact path="/signup" element={<Signup />} />
        <Route exact path="/reset-password" element={<ResetPassword />} />
        <Route exact path="/onboarding-01" element={<Onboarding01 />} />
        <Route exact path="/onboarding-02" element={<Onboarding02 />} />
        <Route exact path="/onboarding-03" element={<Onboarding03 />} />
        <Route exact path="/onboarding-04" element={<Onboarding04 />} />
        <Route exact path="/component/button" element={<ButtonPage />} />
        <Route exact path="/component/form" element={<FormPage />} />
        <Route exact path="/component/dropdown" element={<DropdownPage />} />
        <Route exact path="/component/alert" element={<AlertPage />} />
        <Route exact path="/component/modal" element={<ModalPage />} />
        <Route exact path="/component/pagination" element={<PaginationPage />} />
        <Route exact path="/component/tabs" element={<TabsPage />} />
        <Route exact path="/component/breadcrumb" element={<BreadcrumbPage />} />
        <Route exact path="/component/badge" element={<BadgePage />} />
        <Route exact path="/component/avatar" element={<AvatarPage />} />
        <Route exact path="/component/tooltip" element={<TooltipPage />} />
        <Route exact path="/component/accordion" element={<AccordionPage />} />
        <Route exact path="/component/icons" element={<IconsPage />} /> */}
        <Route exact path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
}

export default App;
