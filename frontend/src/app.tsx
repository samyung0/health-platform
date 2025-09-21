import React, { useEffect } from 'react';
import {
  Routes,
  Route,
  useLocation
} from 'react-router-dom';

import './css/style.css';

import './charts/ChartjsConfig';

// Import pages
import Dashboard from './pages/(default)/dashboard/page';
import Analytics from './pages/(default)/dashboard/analytics/page';
import Fintech from './pages/(default)/dashboard/fintech/page';
import Customers from './pages/(default)/ecommerce/customers/page';
import Orders from './pages/(default)/ecommerce/orders/page';
import Invoices from './pages/(default)/ecommerce/invoices/page';
import Shop from './pages/(default)/ecommerce/(shop)/shop/page';
import Shop2 from './pages/(default)/ecommerce/(shop)/shop-2/page';
import Product from './pages/(default)/ecommerce/product/page';
import Cart from './pages/(default)/ecommerce/(cart)/cart/page';
import Cart2 from './pages/(default)/ecommerce/(cart)/cart-2/page';
import Cart3 from './pages/(default)/ecommerce/(cart)/cart-3/page';
import Pay from './pages/(pay)/ecommerce/pay/page';
import Campaigns from './pages/(default)/campaigns/page';
import UsersTabs from './pages/(default)/community/users-tabs/page';
import UsersTiles from './pages/(default)/community/users-tiles/page';
import Profile from './pages/(default)/community/profile/page';
import Feed from './pages/(default)/community/feed/page';
import Forum from './pages/(default)/community/forum/page';
import ForumPost from './pages/(default)/community/forum/post/page';
import Meetups from './pages/(default)/community/meetups/page';
import MeetupsPost from './pages/(default)/community/meetups/post/page';
import CreditCards from './pages/(default)/finance/cards/page';
import Transactions from './pages/(default)/finance/transactions/page';
import TransactionDetails from './pages/(default)/finance/transactions/page';
import JobListing from './pages/(default)/jobs/page';
import JobPost from './pages/(default)/jobs/post/page';
import CompanyProfile from './pages/(default)/jobs/company/page';
import Messages from './pages/(default)/messages/page';
import TasksKanban from './pages/(default)/tasks/kanban/page';
import TasksList from './pages/(default)/tasks/list/page';
import Inbox from './pages/(default)/inbox/page';
import Calendar from './pages/(default)/calendar/page';
import Account from './pages/(default)/settings/account/page';
import Notifications from './pages/(default)/settings/notifications/page';
import Apps from './pages/(default)/settings/apps/page';
import Plans from './pages/(default)/settings/plans/page';
import Billing from './pages/(default)/settings/billing/page';
import Feedback from './pages/(default)/settings/feedback/page';
import Changelog from './pages/(default)/utility/changelog/page';
import Roadmap from './pages/(default)/utility/roadmap/page';
import Faqs from './pages/(default)/utility/faqs/page';
import EmptyState from './pages/(default)/utility/empty-state/page';
import PageNotFound from './pages/(default)/utility/404/page';
import KnowledgeBase from './pages/(default)/utility/knowledge-base/page';
import Signin from './pages/(auth)/signin/page';
import Signup from './pages/(auth)/signup/page';
import ResetPassword from './pages/(auth)/reset-password/page';
import Onboarding01 from './pages/(onboarding)/onboarding-01/page';
import Onboarding02 from './pages/(onboarding)/onboarding-02/page';
import Onboarding03 from './pages/(onboarding)/onboarding-03/page';
import Onboarding04 from './pages/(onboarding)/onboarding-04/page';
import ButtonPage from './pages/(default)/components-library/button/page';
import FormPage from './pages/(default)/components-library/form/page';
import DropdownPage from './pages/(default)/components-library/dropdown/page';
import AlertPage from './pages/(default)/components-library/alert/page';
import ModalPage from './pages/(default)/components-library/modal/page';
import PaginationPage from './pages/(default)/components-library/pagination/page';
import TabsPage from './pages/(default)/components-library/tabs/page';
import BreadcrumbPage from './pages/(default)/components-library/breadcrumb/page';
import BadgePage from './pages/(default)/components-library/badge/page';
import AvatarPage from './pages/(default)/components-library/avatar/page';
import TooltipPage from './pages/(default)/components-library/tooltip/page';
import AccordionPage from './pages/(default)/components-library/accordion/page';
import IconsPage from './pages/(default)/components-library/icons/page';

function App() {

  const location = useLocation();

  useEffect(() => {
    document.querySelector('html')!.style.scrollBehavior = 'auto'
    window.scroll({ top: 0 })
    document.querySelector('html')!.style.scrollBehavior = ''
  }, [location.pathname]); // triggered on route change

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard/analytics" element={<Analytics />} />
        <Route path="/dashboard/fintech" element={<Fintech />} />
        <Route path="/ecommerce/customers" element={<Customers />} />
        <Route path="/ecommerce/orders" element={<Orders />} />
        <Route path="/ecommerce/invoices" element={<Invoices />} />
        <Route path="/ecommerce/shop" element={<Shop />} />
        <Route path="/ecommerce/shop-2" element={<Shop2 />} />
        <Route path="/ecommerce/product" element={<Product />} />
        <Route path="/ecommerce/cart" element={<Cart />} />
        <Route path="/ecommerce/cart-2" element={<Cart2 />} />
        <Route path="/ecommerce/cart-3" element={<Cart3 />} />
        <Route path="/ecommerce/pay" element={<Pay />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/community/users-tabs" element={<UsersTabs />} />
        <Route path="/community/users-tiles" element={<UsersTiles />} />
        <Route path="/community/profile" element={<Profile />} />
        <Route path="/community/feed" element={<Feed />} />
        <Route path="/community/forum" element={<Forum />} />
        <Route path="/community/forum-post" element={<ForumPost />} />
        <Route path="/community/meetups" element={<Meetups />} />
        <Route path="/community/meetups-post" element={<MeetupsPost />} />
        <Route path="/finance/cards" element={<CreditCards />} />
        <Route path="/finance/transactions" element={<Transactions />} />
        <Route path="/finance/transaction-details" element={<TransactionDetails />} />
        <Route path="/job/job-listing" element={<JobListing />} />
        <Route path="/job/job-post" element={<JobPost />} />
        <Route path="/job/company-profile" element={<CompanyProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/tasks/kanban" element={<TasksKanban />} />
        <Route path="/tasks/list" element={<TasksList />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/settings/account" element={<Account />} />
        <Route path="/settings/notifications" element={<Notifications />} />
        <Route path="/settings/apps" element={<Apps />} />
        <Route path="/settings/plans" element={<Plans />} />
        <Route path="/settings/billing" element={<Billing />} />
        <Route path="/settings/feedback" element={<Feedback />} />
        <Route path="/utility/changelog" element={<Changelog />} />
        <Route path="/utility/roadmap" element={<Roadmap />} />
        <Route path="/utility/faqs" element={<Faqs />} />
        <Route path="/utility/empty-state" element={<EmptyState />} />
        <Route path="/utility/404" element={<PageNotFound />} />
        <Route path="/utility/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding-01" element={<Onboarding01 />} />
        <Route path="/onboarding-02" element={<Onboarding02 />} />
        <Route path="/onboarding-03" element={<Onboarding03 />} />
        <Route path="/onboarding-04" element={<Onboarding04 />} />
        <Route path="/component/button" element={<ButtonPage />} />
        <Route path="/component/form" element={<FormPage />} />
        <Route path="/component/dropdown" element={<DropdownPage />} />
        <Route path="/component/alert" element={<AlertPage />} />
        <Route path="/component/modal" element={<ModalPage />} />
        <Route path="/component/pagination" element={<PaginationPage />} />
        <Route path="/component/tabs" element={<TabsPage />} />
        <Route path="/component/breadcrumb" element={<BreadcrumbPage />} />
        <Route path="/component/badge" element={<BadgePage />} />
        <Route path="/component/avatar" element={<AvatarPage />} />
        <Route path="/component/tooltip" element={<TooltipPage />} />
        <Route path="/component/accordion" element={<AccordionPage />} />
        <Route path="/component/icons" element={<IconsPage />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
}

export default App;
