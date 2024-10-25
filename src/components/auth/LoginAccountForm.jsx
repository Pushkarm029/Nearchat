import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { invoke } from "@tauri-apps/api/core";
import "./SignIn.css";

export default function Login(props) {
    const { onCreateForm, onLogin } = props;
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const dispatch = useDispatch();

    const handleSignIn = () => {
        dispatch({ type: "SET_EMAIL", payload: email });
    };

    const setError = (message) => {
        setErrorMessage(message);
    };

    const handleCreateNewAccount = () => {
        onCreateForm();
    };

    const [count, setCount] = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await invoke("login_handler", {
                loginData: { email, password }
            });
            console.log(response);
            onLogin();
            handleSignIn();
        } catch (error) {
            console.error(error);
            setCount(count + 1);
            if (error === "Email or password combination not found") {
                setError("User not found. Please create a new account.");
            } else {
                setError("An error occurred: " + error);
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <img src="https://i.imgur.com/MOv9vX3.png" alt="Insta-Clone" />
                </div>
                {errorMessage && (
                    <div className="auth-error-message">
                        {count > 5 ? (
                            <p className="auth-error-text">Button Disabled</p>
                        ) : (
                            <p className="auth-error-text">{errorMessage}</p>
                        )}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="email"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        data-testid="password"
                    />
                    <button disabled={count > 5} type="submit">
                        Log In
                    </button>
                </form>
                <div className="signup-container">
                    <button onClick={handleCreateNewAccount} type="button">
                        Create New Account
                    </button>
                </div>
            </div>
        </div>
    );
}
