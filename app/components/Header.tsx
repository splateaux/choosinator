import { Form, Link } from "@remix-run/react";
import React from "react";

import { User } from "~/models/user.server";

import { useTheme } from "../root";

interface HeaderProps {
    user?: User; // User prop is optional
}

const Header: React.FC<HeaderProps> = ({ user }) => {
    const { toggleTheme } = useTheme();
    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px' }}>
            <div style={{ flex: 1 }}></div> {/* Empty div for balancing the center title */}
            <h1 style={{ flex: 1, textAlign: 'center', fontSize: '2rem', fontWeight: 'bold' }}>Choosinator</h1>
            <div style={{ flex: 1, textAlign: 'right' }}>
                {user ? (
                    <>
                        <span>{user.email}</span>
                        <button onClick={toggleTheme} style={{ marginLeft: '10px' }}>🔧</button>
                        <Form action="/logout" method="post" style={{ display: 'inline' }}>
                            <button
                                type="submit"
                                style={{ background: 'none', border: 'none', padding: 0, margin: '0 10px', textDecoration: 'underline', cursor: 'pointer' }}
                            >
                                Log Out
                            </button>
                        </Form>
                    </>
                ) : (
                    <>
                        <Link to="/join">Sign Up</Link>
                        <Link to="/login" style={{ marginLeft: '15px' }}>Log In</Link>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;
