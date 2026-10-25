import { Route, Routes } from "react-router-dom";
import { PublicSiteLayout } from "../layouts/PublicSiteLayout";
import { Home, PublicMenu } from "../pages/public";
import { CustomerOrder, TableEntry } from "../pages/customer";
import {
  AdminLayout,
  Analytics,
  Dashboard,
  Login,
  Orders,
} from "../pages/admin";
import {
  CategoriesManager,
  MenuManager,
  ReservationsManager,
  SettingsManager,
  StaffManager,
} from "../pages/management";
import { TablesManager } from "../pages/tables";
export default function App() {
  return (
    <Routes>
      <Route element={<PublicSiteLayout />}>
        <Route index element={<Home />} />
        <Route path="menu" element={<PublicMenu />} />
      </Route>
      <Route path="table/:qrToken" element={<TableEntry />} />
      <Route path="table/order" element={<CustomerOrder />} />
      <Route path="staff/login" element={<Login />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="menu" element={<MenuManager />} />
        <Route path="categories" element={<CategoriesManager />} />
        <Route path="tables" element={<TablesManager />} />
        <Route path="reservations" element={<ReservationsManager />} />
        <Route path="staff" element={<StaffManager />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<SettingsManager />} />
      </Route>
      <Route path="staff/kitchen" element={<AdminLayout />}>
        <Route index element={<Orders kitchen />} />
      </Route>
      <Route
        path="*"
        element={
          <div className="grid min-h-screen place-items-center">
            <div className="text-center">
              <p className="font-serif text-7xl">404</p>
              <a className="mt-4 block text-clay" href="/">
                Return home
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
