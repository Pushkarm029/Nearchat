import React, { useEffect, useState } from 'react';
import { AiFillHeart } from 'react-icons/ai';
import { TbMessageCircle2Filled } from 'react-icons/tb';
import { invoke } from '@tauri-apps/api/tauri';
import './App.css';
import { OverlayTest as ShowOverlay } from '../overlay/overlay.jsx';

export default function Explore() {
  const [data, setData] = useState([]);
  const [hoverExploreIMG, setHoverExploreIMG] = useState(null);
  const [showOverlayState, setShowOverlayState] = useState([false, '', '', '', '', '']);
  const [showOverlay, overlayId, overlayCaption, overlayLikes, overlayImageID, overlayEmail] = showOverlayState;

  useEffect(() => {
    const fetchExplorePosts = async () => {
      try {
        const response = await invoke('explore_posts_handler');
        if (Array.isArray(response)) {
          console.log('Posts with images:', response)
          setData(response);
        } else {
          console.error('Invalid API response:', response);
          setData([]);
        }
      } catch (error) {
        console.error('Error fetching explore posts:', error);
        setData([]);
      }
    };

    fetchExplorePosts();
  }, []);

  const handleOverlayStateChange = () => {
    setShowOverlayState((prevState) => [!prevState[0], ...prevState.slice(1)]);
  };

  const filteredData = data.filter(item => item.image_link && item.username);

  return (
    <div className="randomexploreposts">
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
      {filteredData && filteredData.length > 0 ? (
        filteredData.map((post, index) => (
          <div
            key={index}
            onClick={() =>
              setShowOverlayState([
                true,
                post.username,
                post.caption,
                post.likes,
                post.image_link,
                post.email,
              ])
            }
            onMouseEnter={() => setHoverExploreIMG(index)}
            onMouseLeave={() => setHoverExploreIMG(null)}
            className="exploreImages"
          >
            {hoverExploreIMG === index && (
              <div className="hoverOverlayExplore">
                <div className="hoverOverlayExploreContent">
                  <div className="hoverOverlayExploreLike">
                    <AiFillHeart size={25} color="white" />
                    <p>{post.likes}</p>
                  </div>
                  <div className="hoverOverlayExploreComment">
                    <TbMessageCircle2Filled size={25} color="white" />
                    {post.comments && post.comments.length > 0 ? (
                      <p>{post.comments.length}</p>
                    ) : (
                      <p>0</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <img src={post.image_link} alt={post.caption} />
          </div>
        ))
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
