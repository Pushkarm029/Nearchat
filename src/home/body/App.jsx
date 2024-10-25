import React, { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import "./App.css";
import { FiMoreHorizontal, FiMessageSquare, FiBookmark } from "react-icons/fi";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { RiShareForwardLine } from "react-icons/ri";
import { BsFillBookmarkFill } from "react-icons/bs";
import { OverlayTest as ShowOverlay } from "../../overlay/overlay.jsx";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { accountList } from "../../data/account.jsx";

function CheckUsername(text) {
  return text.length >= 11 ? text.slice(0, 8) + "..." : text;
}

function HomeBookmark({ bookmark, onClick }) {
  return bookmark 
    ? <BsFillBookmarkFill onClick={onClick} size={22} color="white" style={{ paddingRight: '8px', paddingTop: '7px', paddingBottom: '7px' }} />
    : <FiBookmark onClick={onClick} size={25} color="white" style={{ paddingRight: '7px', paddingTop: '7px', paddingBottom: '7px' }} />;
}

export default function Body() {
  const [liked, setLiked] = useState(false);
  const [dataHome, setDataHome] = useState([]);
  const userEmail = useSelector((state) => state.user.userEmail);
  const navigate = useNavigate();
  const [ShowOverlayState, setShowOverlayState] = useState([false, "", "", "", "", ""]);
  const [showOverlay, overlayId, overlayCaption, overlayLikes, overlayImageID, overlayEmail] = ShowOverlayState;
  const [bookmark, setBookmark] = useState([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const data = await invoke('home_posts_handler', { followingList: [userEmail] });
        console.log('API Response Data:', data);
        setDataHome(data);
      } catch (error) {
        console.error('Error fetching home data:', error);
        setDataHome([]);
      }
    };

    fetchHomeData();
  }, [userEmail]);

  const handleLike = async (imageLink) => {
    try {
      const newLiked = !liked;
      setLiked(newLiked);
      const operation = newLiked ? "like" : "dislike";
      await invoke('like_handler', { 
        userMail: userEmail, 
        imageUrl: imageLink, 
        likeData: { likes: dataHome.likes, operation } 
      });
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  const handleOverlayStateChange = () => {
    setShowOverlayState(prevState => [!prevState[0], ...prevState.slice(1)]);
  };

  const handleBookmark = (accountId, postNumber) => {
    const bookmarkId = `${accountId}+${postNumber}`;
    setBookmark(prev => prev.includes(bookmarkId) 
      ? prev.filter(image => image !== bookmarkId)
      : [...prev, bookmarkId]
    );
  };

  const handleNavigation = (targetEmail) => {
    navigate(`/profile?prop=${targetEmail}`);
  };

  return (
    <div className="body">
      {showOverlay && (
        <ShowOverlay
          onStateChange={handleOverlayStateChange}
          OverAcID={overlayId}
          OverAcCaption={overlayCaption}
          OverAcLikes={overlayLikes}
          OverAcImages={overlayImageID}
          OverAcEmail={overlayEmail}
        />
      )}

      <div className="stories">
        {accountList.slice(0, 8).map((account) => (
          <div key={account.id} className="storyinner">
            <img src={account.url} alt={account.id} />
            <p>{CheckUsername(account.id)}</p>
          </div>
        ))}
      </div>

      <div className="posts">
        {dataHome && dataHome.length > 0 ? (
          dataHome.map((account, index) => (
            <div className="post" key={index}>
              <div className="individualpost">
                <div className="postheader">
                  <div className="postheaderpartone">
                    <img src={account.profilelink} alt={account.username} />
                    <p onClick={() => handleNavigation(account.email)} className="postheadertopid">{account.username}</p>
                    <p className="postheadertopduration">· 1 d</p>
                  </div>
                  <FiMoreHorizontal color="white" size={20} />
                </div>
                <div>
                  <div onDoubleClick={() => handleLike(account.image_link)} className="postimage">
                    <img src={account.image_link} alt="" />
                  </div>
                  <div className="interactablepost">
                    <div className="interactablepostleft">
                      {liked ? (
                        <AiFillHeart onClick={() => handleLike(account.image_link)} size={25} color="white" style={{ padding: '7px' }} />
                      ) : (
                        <AiOutlineHeart onClick={() => handleLike(account.image_link)} size={25} color="white" style={{ padding: '7px' }} />
                      )}
                      <FiMessageSquare
                        onClick={() =>
                          setShowOverlayState([
                            true,
                            account.username,
                            account.caption,
                            account.likes,
                            account.image_link,
                            account.email,
                          ])
                        }
                        size={25}
                        color="white"
                        style={{ padding: '7px' }}
                      />
                      <RiShareForwardLine size={25} color="white" style={{ padding: '7px' }} />
                    </div>
                    <div className="interactablepostright">
                      <HomeBookmark
                        onClick={() => handleBookmark(account.username, index)}
                        bookmark={bookmark.includes(`${account.username}+${index}`)}
                      />
                    </div>
                  </div>
                  <div className="postfooter">
                    <p className="homeLikeMeter">{liked ? (parseInt(account.likes) + 1) : account.likes} Likes</p>
                    <div className="postfootercaption">
                      <p className="postFooterAccountName">{account.username}</p>
                      <p className="postFooterAccountCaption">{account.caption}</p>
                    </div>
                    <p>1 comment</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No post available</p>
        )}
      </div>
    </div>
  );
}