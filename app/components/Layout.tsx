import React, { ReactNode } from "react";

import { User } from "~/models/user.server";

import Header from "./Header";


interface LayoutProps {
    children: ReactNode;
    user?: User;
}

const Layout: React.FC<LayoutProps> = ({ children, user }) => {
    return (
        <div>
            <Header user={user} />
            <main>{children}</main>
        </div>
    );
};

export default Layout;
