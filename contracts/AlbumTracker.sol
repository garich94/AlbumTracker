//SPDX-License-Identifier: MIT 

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Album.sol";

contract AlbumTracker is Ownable {
    enum AlbumState {
        Created, Paid, Delivered
    }

    struct AlbumProduct {
        Album album;
        AlbumState state;
        uint price;
        string title;
    }

    mapping(uint => AlbumProduct) public albums;

    uint public currentIndex;

    event AlbumStateChanged(uint _albumIndex, uint _stateNum, address _albumAddress);
    
    function createAlbum(uint _price, string memory _title) public onlyOwner {
        Album newAlbum = new Album(_price, _title, currentIndex, this);

        albums[currentIndex].album = newAlbum;
        albums[currentIndex].state = AlbumState.Created;
        albums[currentIndex].price = _price;
        albums[currentIndex].title = _title;

        emit AlbumStateChanged(currentIndex, uint(albums[currentIndex].state), address(newAlbum));

        currentIndex++;
    }

    function triggerPayment(uint _index) public payable {
        require(albums[_index].state == AlbumState.Created, "This album is already purchased!");
        require(albums[_index].price == msg.value, "We accept only full payments!");
        
        albums[_index].state = AlbumState.Paid;

        emit AlbumStateChanged(_index, uint(albums[_index].state), address(albums[_index].album));
    }

    function triggerDelivery(uint _index) public onlyOwner {
        require(albums[_index].state == AlbumState.Paid, "This album is not paid for!");

        albums[_index].state = AlbumState.Delivered;

        emit AlbumStateChanged(_index, uint(albums[_index]. state), address(albums[_index].album));
    }
}