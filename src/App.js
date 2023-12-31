import { useState, useEffect } from 'react';
import { NFTStorage, File } from 'nft.storage'
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';

// Components
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';

// ABIs
import NFT from './abis/NFT.json'

// Config
import config from './config.json';

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const [image, setImage] = useState(null)
  const [url, setUrl] = useState(null)

  const [isWaiting, setIsWaiting] = useState(null)
  const [message, setMessage] = useState(null)

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    const network = await provider.getNetwork()

    const nft = new ethers.Contract(config[network.chainId].nft.address, NFT, provider)
    setNFT(nft)
  }

  const submitHandler = async (e) => {
    e.preventDefault()

    if (name === "" || description === "") {
      window.alert("Please provide name and description")
      return
    }

    setIsWaiting(true)
    //Image is generated
    const imageData = genreateImage()

    //Image is uploaded in storage
    const url = await uploadImage(imageData)

    //Minting Image
    await mintInage(url)

    setIsWaiting(false)
    setMessage("")
  }

  const genreateImage = async () => {
    setMessage('Generating Image.... ')

    const URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1"
    const response = await axios({
      url: URL,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
        'Content-Type': 'application/json',
        'x-use-cache': false,
      },
      data: JSON.stringify({
        inputs: description,
      }),
      responseType: 'arraybuffer',
    })

    const type = response.headers['content-type']
    const data = response.data

    const base64data = Buffer.from(data).toString('base64')
    const img = `data:${type};base64,` + base64data
    setImage(img)

    return data
  }

  const uploadImage = async (imageData) => {

    console.log("Uploading Image ...")

    // Create Instance to NFT.storage
    const nftStorage = new NFTStorage({ token: process.env.REACT_APP_NFT_STORAGE_API_KEY })

    //Upload the image
    const { ipnft } = await nftStorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: description,
    })

    //Save the Metadata URL
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.jason`
    setUrl(url)

    return url
  }

  const mintInage = async (tokenURI) => {
    setMessage("Waiting to mint ....")

    const signer = await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI, { value: ethers.utils.parseUnits("1", "ether") })
    await transaction.wait()
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />

      <div className='form'>
        <form onSubmit={submitHandler}>
          <input type='text' placeholder='Create a name....' onChange={(e) => { setName(e.target.value) }}></input>
          <input type='text' placeholder='Create a description ....' onChange={(e) => { setDescription(e.target.value) }}></input>
          <input type='submit' value='Create & Mint'></input>
        </form>
        <div className='image'>
          {!isWaiting && image ? (
            <img src={image} alt="AI generated image" />
          ) : isWaiting ? (
            <div className="image__placeholder">
              <Spinner animation="border" />
              <p>{message}</p>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
      {!isWaiting && url && (
        <p>
          View&nbsp;<a href={url} target="_blank" rel="noreferrer">Metadata</a>
        </p>
      )}

    </div>
  );
}

export default App;
