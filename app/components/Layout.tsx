import React, { ReactNode } from "react";
import Header from "./Header";
import { User } from "~/models/user.server";

type LayoutProps = {
    children: ReactNode;
    user?: User;
};

const Layout: React.FC<LayoutProps> = ({ children, user }) => {
    return (
        <div>
            <Header user={user} />
            <main>{children}</main>
        </div>
    );
};

export default Layout;
