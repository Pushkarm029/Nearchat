import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './CreateAccountForm.css';

const CreateAccountForm = ({ onCreateForm }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileImageLink, setProfileImageLink] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [bio, setBio] = useState('');
  const [link, setBioUrl] = useState('');

  const setError = (message) => {
    setErrorMessage(message);
  };

  const handleClick = () => {
    onCreateForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {  
      const result = await invoke('create_user', {
        userData: {
          username,
          email,
          name,
          password,
          bio,
          link,
          profileImageLink,
        }
      });
      console.log('User created:', result);
      setError('Created account successfully. Please Login.');
    } catch (error) {
      console.error('Error creating user:', error);
      setError('An error occurred: ' + error);
    }
  };

  return (
    <div className="create-account-container">
      <div className="create-account-form-container">
        <h2>Create Account</h2>
        {errorMessage && <div className="auth-error-message">{errorMessage}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text" required
            placeholder="Full Name (Required)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text" required
            placeholder="Username (Required)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="email" required
            placeholder="Email (Required)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" required
            placeholder="Password (Required)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="text"
            placeholder="Profile Picture URL"
            value={profileImageLink}
            onChange={(e) => setProfileImageLink(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter your Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter URL to be added in your BIO"
            value={link}
            onChange={(e) => setBioUrl(e.target.value)}
          />
          <button type="submit">Sign Up</button>
        </form>
        <button onClick={handleClick} type="button">
          Log In
        </button>
        <p className='termsandconditionauth'>By signing up, you agree to our Terms and Privacy Policy.</p>
      </div>
    </div>
  );
};

export default CreateAccountForm;