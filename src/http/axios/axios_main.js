import axios from 'axios';

const token = localStorage.getItem('userToken');

const axiosMain = axios.create({
  baseURL:
    process.env.NODE_ENV === 'development'
      ? `${process.env.REACT_APP_END_POINT_URL_DEV}/api/v1`
      : `${process.env.REACT_APP_END_POINT_URL_PROD}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
    'x-auth-token': token,
  },
});
export default axiosMain;
