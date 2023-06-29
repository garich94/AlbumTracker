import { ContractRunner, ContractTransactionResponse } from "ethers";
import { AlbumTracker } from "../typechain-types";

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AlbumTracker", function () {
  let owner;
  let customer: { sendTransaction: (arg0: { to: any; value: number }) => any };
  let albumTracker: {
    waitForDeployment: () => any;
    createAlbum: (arg0: number, arg1: string) => any;
    albums: (arg0: number) => any;
    connect: (arg0: any) => {
      (): any;
      new (): any;
      triggerDelivery: { (arg0: number): any; new (): any };
      createAlbum: { (arg0: number, arg1: string): any; new (): any };
    };
    triggerDelivery: (arg0: number) => any;
  };
  let albumCreateTx: { wait: () => any };
  const albumTitle = "Enchantment of the Ring";
  const albumPrice = 100;

  beforeEach(async function () {
    [owner, customer] = await ethers.getSigners();

    const AlbumTracker = await ethers.getContractFactory("AlbumTracker", owner);
    albumTracker = await AlbumTracker.deploy();
    await albumTracker.waitForDeployment();

    albumCreateTx = await albumTracker.createAlbum(albumPrice, albumTitle);

    await albumCreateTx.wait();
  });

  it("should fetch the first album", async function () {
    const album = await albumTracker.albums(0);

    expect(album.title).to.eq(albumTitle);
    expect(album.price).to.eq(albumPrice);
    expect(album.album).to.be.properAddress;
  });

  // it("Fetch second album and check saved data", async function () {
  //   const album = await albumTracker.albums(1);
  //   expect(album.title).to.eq("Ruki Vverx");
  //   expect(album.price).to.eq("250");
  //   expect(album.album).to.be.properAddress;
  // });

  it("Album contract has no funds", async function () {
    const album = await albumTracker.albums(1);
    const balance = await ethers.provider.getBalance(album.album);
    expect(balance.toString()).to.eq("0");

    console.log(balance.toString());
  });

  it("show emit an event after album creation", async function () {
    const albumObj = await albumTracker.albums(0);

    await expect(albumCreateTx)
      .to.emit(albumTracker, "AlbumStateChanged")
      .withArgs(0, 0, albumObj.album);
  });

  it("should not allow to trigger delivery for non-owners", async function () {
    await expect(
      albumTracker.connect(customer).triggerDelivery(0)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should not allow to trigger delivery when the album is not paid for", async function () {
    await expect(albumTracker.triggerDelivery(0)).to.be.revertedWith(
      "This album is not paid for!"
    );
  });

  it("should allow to pay for the album and trigger delivery", async function () {
    const albumObj = await albumTracker.albums(0);
    const albumAddr = albumObj.album;

    let tx = {
      to: albumAddr,
      value: albumPrice,
    };

    let sendMoneyTx = await customer.sendTransaction(tx);

    await sendMoneyTx.wait();

    await expect(sendMoneyTx)
      .to.emit(albumTracker, "AlbumStateChanged")
      .withArgs(0, 1, albumAddr);

    const triggerDeliveryTx = await albumTracker.triggerDelivery(0);
    await triggerDeliveryTx.wait();

    expect(triggerDeliveryTx)
      .to.emit(albumTracker, "AlbumStateChanged")
      .withArgs(0, 2, albumAddr, albumTitle);

    const proverka = await expect(() => sendMoneyTx).to.changeEtherBalance(
      customer,
      -albumPrice
    );
  });

  it("Only owners can create new albums", async function () {
    await expect(
      albumTracker.connect(customer).createAlbum(albumPrice, albumTitle)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("No way to pay twice for one album", async function () {
    const albumObj = await albumTracker.albums(0);
    const albumAddr = albumObj.album;

    let tx = {
      to: albumAddr,
      value: albumPrice,
    };

    let sendMoneyTx = await customer.sendTransaction(tx);

    await sendMoneyTx.wait();

    await expect(customer.sendTransaction(tx)).to.be.revertedWith(
      "This album is already purchased!"
    );
  });
});
