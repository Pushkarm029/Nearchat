import React, { useState } from 'react';
import './App.css';
import { BiArrowBack } from 'react-icons/bi';
import { useSelector } from 'react-redux';
import { invoke } from '@tauri-apps/api/tauri';
import { useNavigate } from 'react-router-dom';


export default function Create() {
  const [caption, setCaption] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [fileUploaded, setFileUploaded] = useState(null);
  const userEmail = useSelector((state) => state.user.userEmail);
  const navigate = useNavigate();

  if (!userEmail) {
    console.error('User email is missing');
    return null;
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setFileUploaded(file);
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();

    if (!fileUploaded) {
      console.error('No file uploaded');
      return;
    }

    try {
      const uploadResponse = await uploadFileToGoogleCloud();
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        const userData = { user_mail: userEmail, base64_image: uploadResult.mediaLink, caption };
        console.log('Image uploaded:', uploadResult);
        console.log(userData);
        await processToBackend(userData);
        console.log('Navigating to Profile');
        navigate('/Profile', { replace: true });
      } else {
        console.error('Error uploading image:', uploadResponse.statusText);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const processToBackend = async (userData) => {
    try {
      const response = await invoke('upload_post', {
        uploadData: userData,
      });
      console.log(response);
    } catch (error) {
      console.error('Error posting data:', error);
    }
  };

  const uploadFileToGoogleCloud = async () => {
    const url = `https://storage.googleapis.com/upload/storage/v1/b/pushkar_insta/o?uploadType=media&name=${fileUploaded.name}`;
    const token = 'ya29.a0AXooCgvO66NowIr-UT0VFfjKtWcaaiAuceMXPqFRu-qg6j3nj64Ywv4y8GqC8bVpxz3B1p1nS4gHo8F8_8xpUutl3ZHNFo_uX1COQJpF4xEGku6uwGN-dBWhNKSQZm7xmK78IT0BZ3XqWQce-V7i6JIszGnddEmngjy-05LFliN8aCgYKAesSARASFQHGX2Mi8lpWfKt5HdS1T3cjQWFxPg0179';
    // const token2 = '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';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': fileUploaded.type,
      },
      body: fileUploaded,
    });

    return response;
  };

  return (
    <div className="insta-overlay">
      <div className="headerUploadOverlay">
        <BiArrowBack size={25} />
        <p className="headerUploadOverlayText">Create New Post</p>
        <p onClick={submitPost} className="headerUploadOverlayButton">Share</p>
      </div>
      <div className="bodyUploadOverlay">
        <div className="left-section">
          {imagePreview && (
            <img src={imagePreview} alt="Uploaded" className="uploaded-image" />
          )}
        </div>
        <div className="right-section">
          {fileUploaded && (
            <textarea
              className="caption-input"
              placeholder="Add a Caption..."
              rows="4"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          )}
          <div className="upload-image-section">
            <label htmlFor="image-upload" className="upload-label">
              {fileUploaded ? "Change Image" : "Upload Image"}
            </label>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
